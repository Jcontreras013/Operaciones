import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { CepheusConnector, RawOrder } from './cepheus-connector';

/**
 * Cepheus corta con código 102 cuando se agota el cupo compartido de
 * consultas (5/hora, impuesto por IT). No es un error de esta orden de
 * ingesta: hay que esperar al próximo ciclo, sin insistir con otras cuentas
 * (cada intento adicional consume más cupo del mismo límite compartido).
 */
export class CepheusRateLimitError extends Error {}

export interface CepheusApiResponse {
  codigo?: number;
  mensaje?: string;
  ordenes?: RawOrder[];
}

export type CepheusAttemptResult =
  | { kind: 'ok'; ordenes: RawOrder[] }
  | { kind: 'rate_limited'; mensaje: string }
  | { kind: 'retry'; mensaje: string };

/**
 * Decide qué hacer con la respuesta de una cuenta de consulta: un JSON no es
 * sinónimo de éxito, hay que revisar `codigo`. Pura y sin red — es el mismo
 * árbol de decisión de `consultar_api_ordenes` en tools.py, extraído aparte
 * para poder probarlo sin levantar un servidor.
 */
export function evaluarRespuestaCepheus(data: CepheusApiResponse): CepheusAttemptResult {
  if (data.codigo === 102) {
    return { kind: 'rate_limited', mensaje: data.mensaje ?? 'Límite de consultas de Cepheus alcanzado' };
  }
  if (data.codigo !== 200 || !data.ordenes || data.ordenes.length === 0) {
    return { kind: 'retry', mensaje: data.mensaje ?? 'sin mensaje' };
  }
  return { kind: 'ok', ordenes: data.ordenes };
}

/** 'dd/mm/aaaa', el formato que espera el parámetro fechaInicio de Cepheus. */
export function formatFechaDDMMYYYY(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** Arma la URL de consulta para una cuenta dada. */
export function buildCepheusUrl(
  baseUrl: string,
  usuario: string,
  medios: string,
  horaInicio: string,
  fechaInicio: string,
): string {
  return (
    `${baseUrl}?usuario=${encodeURIComponent(usuario)}` +
    `&medios=${encodeURIComponent(medios)}` +
    `&fechaInicio=${encodeURIComponent(fechaInicio)}` +
    `&horaInicio=${encodeURIComponent(horaInicio)}`
  );
}

/**
 * Adaptador HTTP real de Cepheus. Portado de `consultar_api_ordenes` en el
 * `tools.py` de monitor-operativo: HTTP Basic Auth + una lista de cuentas de
 * "usuario" de consulta que se prueban en orden (cada una tiene su propio
 * cupo), parámetros `medios`/`fechaInicio`/`horaInicio`, y una API que
 * siempre responde JSON `{ codigo, ordenes, mensaje }` — un JSON no es
 * sinónimo de error, hay que revisar `codigo`.
 *
 * Todas las credenciales y parámetros vienen de variables de entorno (nunca
 * hardcodeadas, y nunca las que estaban expuestas en el repo público del
 * monitor original — esas deben rotarse en Cepheus/IT).
 */
@Injectable()
export class HttpCepheusConnector implements CepheusConnector {
  private readonly logger = new Logger(HttpCepheusConnector.name);

  private readonly baseUrl = process.env.CEPHEUS_BASE_URL ?? '';
  private readonly authUser = process.env.CEPHEUS_AUTH_USER ?? '';
  private readonly authPassword = process.env.CEPHEUS_AUTH_PASSWORD ?? '';
  private readonly queryUsers = (process.env.CEPHEUS_QUERY_USERS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  private readonly medios = process.env.CEPHEUS_MEDIOS ?? 'FTTH,C';
  private readonly horaInicio = process.env.CEPHEUS_HORA_INICIO ?? '07:00';
  private readonly insecureTls = process.env.CEPHEUS_TLS_INSECURE === 'true';
  private readonly timeoutMs = Number(process.env.CEPHEUS_TIMEOUT_MS ?? 240_000);

  async fetchOrders(dateFrom: Date): Promise<RawOrder[]> {
    if (!this.baseUrl) {
      throw new Error(
        'CEPHEUS_BASE_URL no está configurada (revisa las variables de entorno del conector real)',
      );
    }
    // Si no hay una lista explícita de cuentas de consulta, se usa la misma
    // cuenta de autenticación como única opción.
    const usuarios = this.queryUsers.length > 0 ? this.queryUsers : [this.authUser];
    const fechaInicio = formatFechaDDMMYYYY(dateFrom);

    for (const usuario of usuarios) {
      const url = buildCepheusUrl(this.baseUrl, usuario, this.medios, this.horaInicio, fechaInicio);
      const data = await this.getJson(url);
      const resultado = evaluarRespuestaCepheus(data);

      if (resultado.kind === 'rate_limited') {
        this.logger.warn(
          `Límite de consultas de Cepheus alcanzado (código 102): ${resultado.mensaje}. ` +
            'No se insiste con otras cuentas; se reintentará en el próximo ciclo.',
        );
        throw new CepheusRateLimitError(resultado.mensaje);
      }

      if (resultado.kind === 'retry') {
        this.logger.warn(
          `Cepheus respondió sin órdenes para "${usuario}": ${resultado.mensaje}. Probando siguiente cuenta...`,
        );
        continue;
      }

      this.logger.log(`${resultado.ordenes.length} órdenes descargadas con éxito con la cuenta "${usuario}".`);
      return resultado.ordenes;
    }

    this.logger.warn('Ninguna de las cuentas de consulta configuradas devolvió órdenes.');
    return [];
  }

  /** GET con Basic Auth; loguea el error y sigue con la siguiente cuenta si falla. */
  private getJson(url: string): Promise<CepheusApiResponse> {
    return new Promise((resolve) => {
      const authHeader = 'Basic ' + Buffer.from(`${this.authUser}:${this.authPassword}`).toString('base64');
      const fallback = (mensaje: string): CepheusApiResponse => ({ codigo: -1, mensaje, ordenes: [] });

      const req = https.get(
        url,
        {
          headers: {
            Authorization: authHeader,
            'User-Agent': 'Operaciones-Monitor/1.0',
            Accept: 'application/json',
          },
          // Cepheus es un servidor interno con certificado propio en algunos
          // despliegues; solo se relaja si CEPHEUS_TLS_INSECURE=true.
          rejectUnauthorized: !this.insecureTls,
          timeout: this.timeoutMs,
        },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c: Buffer) => chunks.push(c));
          res.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8').trim();
            if (res.statusCode !== 200) {
              this.logger.warn(`Cepheus respondió HTTP ${res.statusCode} para ${url}`);
              resolve(fallback(`HTTP ${res.statusCode}`));
              return;
            }
            try {
              resolve(JSON.parse(body) as CepheusApiResponse);
            } catch {
              this.logger.warn('La respuesta de Cepheus no es JSON válido.');
              resolve(fallback('Respuesta no es JSON válido'));
            }
          });
        },
      );
      req.on('timeout', () => {
        req.destroy();
        this.logger.warn(`Tiempo de espera agotado consultando Cepheus (${this.timeoutMs}ms).`);
        resolve(fallback('Tiempo de espera agotado'));
      });
      req.on('error', (err) => {
        this.logger.warn(`Error de red consultando Cepheus: ${err.message}`);
        resolve(fallback(err.message));
      });
    });
  }
}
