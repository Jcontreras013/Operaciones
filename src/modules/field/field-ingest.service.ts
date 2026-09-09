import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, FindOptionsWhere, ILike, In, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity';
import { IngestRun } from './entities/ingest-run.entity';
import { CEPHEUS_CONNECTOR, CepheusConnector, RawOrder } from './cepheus/cepheus-connector';
import { CepheusRateLimitError } from './cepheus/http-cepheus.connector';
import { clasificarCausaOffline, computeOfflineFlags, esUniversoDiagnostico } from './offline';
import {
  ACTIVIDADES_PERMITIDAS,
  categoriaRetraso,
  CategoriaRetraso,
  clasificarTablero,
  diasRetraso,
  esAntesDeHoyHonduras,
  esCritica,
  esMismoDiaHonduras,
  esNoAsignadaValida,
  esPendienteMonitor,
  esPlex,
  tieneTecnicoValido,
} from './reportes';

/** Lee una clave (mayúsculas) de la orden cruda como string no vacío, o null. */
function str(raw: RawOrder, key: string): string | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Honduras es UTC-6 todo el año (sin horario de verano). */
const HN_OFFSET_MS = 6 * 60 * 60 * 1000;

/**
 * Parsea 'dd/mm/aaaa [HH:MM]' o ISO a Date; null si no se puede.
 *
 * Cepheus reporta en hora de Honduras — 'dd/mm/aaaa HH:MM' es un reloj de
 * pared de Honduras, no la zona horaria del proceso. Se arma el instante UTC
 * explícitamente con el offset fijo (`Date.UTC(...) + HN_OFFSET_MS`) para no
 * depender de en qué zona horaria corre el servidor (en producción es UTC,
 * y `new Date(y,m,d,h,mi)` lo interpretaría como hora del servidor, no de
 * Honduras — desfasaba todo por 6h: ALERTA_TIEMPO, el Gantt, y a qué día
 * calendario pertenece cada orden).
 */
export function parseFecha(value: string | null): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) {
    const [, dd, mm, yyyy, hh = '00', mi = '00'] = m;
    const ms = Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi)) + HN_OFFSET_MS;
    const d = new Date(ms);
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(value);
  return isNaN(iso.getTime()) ? null : iso;
}

/**
 * Combina una hora suelta ('HH:MM[:SS]', tal como la manda Cepheus para
 * HORA_INI/HORA_LIQ) con la fecha calendario **de Honduras** de `fechaBase`
 * (ya un instante UTC correcto), para obtener una marca de tiempo completa.
 * Si `horaRaw` ya trae fecha propia, se usa esa (vía `parseFecha`).
 */
function combineFechaHora(fechaBase: Date | null, horaRaw: string | null): Date | null {
  if (!horaRaw) return null;
  const directo = parseFecha(horaRaw);
  if (directo) return directo;
  const m = horaRaw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m && fechaBase) {
    const [, hh, mi, ss = '0'] = m;
    // Reloj de pared de Honduras de fechaBase: se resta el offset para leer
    // año/mes/día "como si" el instante ya estuviera en hora de Honduras.
    const hnWallClock = new Date(fechaBase.getTime() - HN_OFFSET_MS);
    const ms =
      Date.UTC(
        hnWallClock.getUTCFullYear(),
        hnWallClock.getUTCMonth(),
        hnWallClock.getUTCDate(),
        Number(hh),
        Number(mi),
        Number(ss),
      ) + HN_OFFSET_MS;
    return new Date(ms);
  }
  return null;
}

export interface IngestResult {
  fetched: number;
  created: number;
  updated: number;
  runId: string;
}

export interface GanttRow {
  tecnico: string;
  externalNum: string;
  cliente: string | null;
  actividad: string | null;
  estado: string | null;
  /** ISO. Cuándo empezó a trabajarse la orden (HORA_INI). */
  inicio: string;
  /** ISO. HORA_LIQ, o el momento actual/fin del día si sigue abierta. */
  fin: string;
}

export interface ConteoEtiqueta {
  etiqueta: string;
  cantidad: number;
}

/** Avance de un segmento: universo "mora" (atrasado) vs. "hoy" (al día), y cuánto se cerró. */
export interface SegmentoStats {
  totalGlobal: number;
  cerradasGlobal: number;
  pctGlobal: number;
  totalMora: number;
  cerradasMora: number;
  pctMora: number;
  totalHoy: number;
  cerradasHoy: number;
  pctHoy: number;
}

export interface ReportesBoard {
  kpis: {
    pendientesAsignadas: number;
    cerradasHoy: number;
    tecnicosEnRuta: number;
    caidasOffline: number;
    totalGeneral: number;
  };
  tablero: {
    resumenRetraso: { categoria: CategoriaRetraso; cantidad: number }[];
    sop: ConteoEtiqueta[];
    excedenDosHoras: number;
    instalaciones: ConteoEtiqueta[];
    plex: ConteoEtiqueta[];
  };
  segmentos: {
    residencial: SegmentoStats;
    plex: SegmentoStats;
    global: SegmentoStats;
  };
}

const CATEGORIAS_RETRASO: CategoriaRetraso[] = ['>= 7 Dia', '= 4 a 6 Dias', '= 1 a 3 Dias', '= 0 Dia'];
const SUBTIPOS_INSTALACION = ['Nueva', 'Adición', 'Cambio / Migración', 'Recuperado'];

@Injectable()
export class FieldIngestService {
  private readonly logger = new Logger(FieldIngestService.name);

  constructor(
    @InjectRepository(WorkOrder) private readonly orders: Repository<WorkOrder>,
    @InjectRepository(IngestRun) private readonly runs: Repository<IngestRun>,
    @Inject(CEPHEUS_CONNECTOR) private readonly cepheus: CepheusConnector,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Ingiere las órdenes de Cepheus desde `from` y las persiste (upsert por NUM).
   * Idempotente: re-ingerir la misma ventana actualiza, no duplica.
   */
  async ingest(tenantId: string, from: Date): Promise<IngestResult> {
    let fetched = 0;
    let created = 0;
    let updated = 0;
    let status = 'ok';
    let error: string | null = null;
    const ingestedAt = new Date();

    try {
      const raws = await this.cepheus.fetchOrders(from);
      fetched = raws.length;

      await this.dataSource.transaction(async (manager) => {
        const repo = manager.getRepository(WorkOrder);
        for (const raw of raws) {
          const externalNum = str(raw, 'NUM');
          if (!externalNum) continue; // sin identificador no se puede upsert
          const fechaApeRaw = str(raw, 'FECHA_APE');
          const fechaApe = parseFecha(fechaApeRaw);
          const comentario = str(raw, 'COMENTARIO');
          const horaIni = str(raw, 'HORA_INI');
          const horaLiq = str(raw, 'HORA_LIQ');
          const horaIniAt = combineFechaHora(fechaApe, horaIni);
          const horaLiqAt = combineFechaHora(fechaApe, horaLiq);
          const razonCierreSop = str(raw, 'RAZON_CIERRE_SOP');
          const comentarioCierre = str(raw, 'COMENTARIO_CIERRE');
          const estado = str(raw, 'ESTADO');
          const actividad = str(raw, 'ACTIVIDAD');
          const tecnico = str(raw, 'TECNICO');

          const { esOffline, alertaTiempo } = computeOfflineFlags(
            { actividad, estado, tecnico, comentario, horaIniAt, horaLiqAt },
            ingestedAt,
          );
          // Universo del diagnóstico de causa raíz: soportes de fibra YA
          // CERRADOS con técnico asignado (distinto de `esOffline`, que solo
          // mira órdenes abiertas — ver offline.ts).
          const { causa: causaOffline, evidencia: causaOfflineEvidencia } = esUniversoDiagnostico({
            actividad,
            estado,
            tecnico,
          })
            ? clasificarCausaOffline(razonCierreSop, comentarioCierre, comentario)
            : { causa: null, evidencia: null };

          const fields = {
            tenantId,
            externalNum,
            cliente: str(raw, 'CLIENTE'),
            tecnico,
            actividad,
            estado,
            tipoOrden: str(raw, 'TIPOORDEN'),
            subtipo: str(raw, 'SUBTIPO'),
            segmento: str(raw, 'SEGMENTO'),
            grupo: str(raw, 'GRUPO'),
            colonia: str(raw, 'COLONIA'),
            olt: str(raw, 'OLT'),
            pon: str(raw, 'PON'),
            causa: str(raw, 'CAUSA'),
            motivo: str(raw, 'MOTIVO'),
            comentario,
            atribucion: str(raw, 'ATRIBUCION'),
            gps: str(raw, 'GPS'),
            mxref: str(raw, 'MXREF'),
            fechaApeRaw,
            fechaApe,
            horaIni,
            horaLiq,
            horaIniAt,
            horaLiqAt,
            razonCierreSop,
            comentarioCierre,
            esOffline,
            alertaTiempo,
            causaOffline,
            causaOfflineEvidencia,
            raw,
            source: 'cepheus',
            ingestedAt,
          };
          const existing = await repo.findOne({ where: { tenantId, externalNum } });
          if (existing) {
            // save con id actualiza la fila (update() no admite bien el jsonb).
            await repo.save({ ...fields, id: existing.id });
            updated += 1;
          } else {
            await repo.save(fields);
            created += 1;
          }
        }
      });
    } catch (err) {
      if (err instanceof CepheusRateLimitError) {
        // No es una falla de esta corrida: se agotó el cupo compartido de
        // consultas de Cepheus. Se registra aparte para no confundirlo con
        // un error real y no generar ruido innecesario en los logs.
        status = 'rate_limited';
        error = err.message;
        this.logger.warn(`Ingesta pospuesta por límite de Cepheus: ${error}`);
      } else {
        status = 'error';
        error = err instanceof Error ? err.message : String(err);
        this.logger.error(`Ingesta falló: ${error}`);
      }
    }

    const run = await this.runs.save({
      tenantId,
      source: 'cepheus',
      requestedFrom: from,
      status,
      fetched,
      created,
      updated,
      error,
    });

    return { fetched, created, updated, runId: run.id };
  }

  async listWorkOrders(
    tenantId: string,
    filters: {
      estado?: string[];
      actividad?: string[];
      motivo?: string[];
      tecnico?: string;
      olt?: string;
      search?: string;
      from?: string;
      to?: string;
      criticas?: boolean;
      noAsignadas?: boolean;
    } = {},
  ): Promise<WorkOrder[]> {
    const where: FindOptionsWhere<WorkOrder> = { tenantId };
    if (filters.estado?.length) where.estado = In(filters.estado);
    if (filters.actividad?.length) where.actividad = In(filters.actividad);
    if (filters.motivo?.length) where.motivo = In(filters.motivo);
    if (filters.tecnico) where.tecnico = ILike(`%${filters.tecnico}%`);
    if (filters.olt) where.olt = filters.olt;
    if (filters.search) where.externalNum = ILike(`%${filters.search}%`);

    // "to" es inclusivo del día completo si viene sin hora (YYYY-MM-DD), para
    // poder pedir "un día" sin tener que calcular medianoche del día siguiente.
    const desde = filters.from ? new Date(filters.from) : null;
    const hasta = filters.to ? new Date(filters.to) : null;
    if (hasta && !filters.to?.includes('T')) hasta.setHours(23, 59, 59, 999);
    if (desde && hasta) where.fechaApe = Between(desde, hasta);
    else if (desde) where.fechaApe = MoreThanOrEqual(desde);
    else if (hasta) where.fechaApe = LessThanOrEqual(hasta);

    // "Ver solo Críticas"/"Ver NO Asignadas" son máscaras calculadas (no
    // expresables como columna SQL sin duplicar la clasificación), así que
    // se aplican en memoria — para eso hace falta traer todo lo que cumple
    // el resto de filtros, no solo la página visible.
    if (filters.criticas || filters.noAsignadas) {
      const todas = await this.orders.find({ where, order: { fechaApe: 'DESC' } });
      return todas.filter((o) => {
        if (filters.criticas && !esCritica(o.actividad, o.esOffline, o.alertaTiempo)) return false;
        if (filters.noAsignadas && !esNoAsignadaValida(o.actividad, o.tecnico)) return false;
        return true;
      });
    }

    // Con filtro de fecha el resultado ya viene acotado por naturaleza (un
    // día o un rango corto); sin filtro, se limita a lo más reciente.
    const take = desde || hasta ? 500 : 200;
    return this.orders.find({ where, order: { fechaApe: 'DESC' }, take });
  }

  /**
   * Línea de tiempo por técnico (Gantt) de un día calendario en Honduras
   * (UTC-6 todo el año, sin horario de verano). Reemplaza al "Gantt en
   * vivo"/"Gantt Histórico" de app.py: una franja por orden trabajada ese
   * día, desde HORA_INI hasta HORA_LIQ (o hasta ahora/fin del día si sigue
   * abierta), con un ancho mínimo para que las visitas cortas se vean.
   */
  async getGantt(tenantId: string, dateStr: string): Promise<GanttRow[]> {
    const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) {
      throw new BadRequestException('Fecha inválida, use YYYY-MM-DD');
    }
    const [, y, mo, d] = m;
    const inicioDia = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)) + HN_OFFSET_MS);
    const finDia = new Date(inicioDia.getTime() + 24 * 60 * 60 * 1000);

    const orders = await this.orders.find({
      where: { tenantId, horaIniAt: Between(inicioDia, finDia) },
      order: { tecnico: 'ASC', horaIniAt: 'ASC' },
    });

    const ahora = new Date();
    const limiteFin = ahora >= inicioDia && ahora < finDia ? ahora : finDia;
    const minMs = 15 * 60 * 1000;

    return orders
      .filter((o) => o.tecnico && o.horaIniAt)
      .map((o) => {
        const inicio = o.horaIniAt as Date;
        let fin = o.horaLiqAt ?? limiteFin;
        if (fin.getTime() - inicio.getTime() < minMs) fin = new Date(inicio.getTime() + minMs);
        if (fin > finDia) fin = finDia;
        return {
          tecnico: o.tecnico as string,
          externalNum: o.externalNum,
          cliente: o.cliente,
          actividad: o.actividad,
          estado: o.estado,
          inicio: inicio.toISOString(),
          fin: fin.toISOString(),
        };
      });
  }

  async getWorkOrder(tenantId: string, id: string): Promise<WorkOrder> {
    const order = await this.orders.findOne({ where: { tenantId, id } });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }
    return order;
  }

  listRuns(tenantId: string): Promise<IngestRun[]> {
    return this.runs.find({ where: { tenantId }, order: { createdAt: 'DESC' }, take: 50 });
  }

  /** Tablero del monitor: totales y agregados por estado, actividad, motivo y técnico. */
  async getBoard(tenantId: string): Promise<{
    total: number;
    byEstado: { key: string; count: number }[];
    byActividad: { key: string; count: number }[];
    byMotivo: { key: string; count: number }[];
    byTecnico: { key: string; count: number }[];
    lastIngest: { ranAt: string; fetched: number; status: string } | null;
  }> {
    const total = await this.orders.count({ where: { tenantId } });
    const [byEstado, byActividad, byMotivo, byTecnico] = await Promise.all([
      this.groupCount(tenantId, 'estado'),
      this.groupCount(tenantId, 'actividad'),
      this.groupCount(tenantId, 'motivo'),
      this.groupCount(tenantId, 'tecnico', 10),
    ]);
    const run = await this.runs.findOne({
      where: { tenantId },
      order: { createdAt: 'DESC' },
    });
    return {
      total,
      byEstado,
      byActividad,
      byMotivo,
      byTecnico,
      lastIngest: run
        ? { ranAt: run.createdAt.toISOString(), fetched: run.fetched, status: run.status }
        : null,
    };
  }

  /**
   * Diagnóstico de offline (Fase C): cuántos equipos de red están caídos,
   * por qué (causa raíz clasificada del cierre) y dónde (mapa OLT/PON), para
   * ubicar concentraciones de fallas sin depender de telemetría en vivo.
   */
  async getOfflineBoard(
    tenantId: string,
    diagnosticoDias = 30,
  ): Promise<{
    totalOffline: number;
    totalAlertaTiempo: number;
    porCausa: { key: string; count: number }[];
    porOlt: { olt: string; total: number; offline: number }[];
    porPon: { olt: string; pon: string; total: number; offline: number }[];
    ordenes: WorkOrder[];
  }> {
    const [totalOffline, totalAlertaTiempo, porCausa, porOlt, porPon, ordenes] = await Promise.all([
      this.orders.count({ where: { tenantId, esOffline: true } }),
      this.orders.count({ where: { tenantId, alertaTiempo: true } }),
      this.porCausaOffline(tenantId, diagnosticoDias),
      this.groupByOltPon(tenantId, false),
      this.groupByOltPon(tenantId, true),
      this.orders.find({ where: { tenantId, esOffline: true }, order: { fechaApe: 'ASC' }, take: 100 }),
    ]);
    return { totalOffline, totalAlertaTiempo, porCausa, porOlt, porPon, ordenes };
  }

  /**
   * Distribución de causas raíz entre los soportes de fibra ya cerrados
   * (con causa clasificada) de los últimos `dias` días — incluye los falsos
   * positivos, es el complemento de `porOlt`/`porPon`: aquel dice DÓNDE se
   * concentran las caídas, este dice POR QUÉ.
   */
  private async porCausaOffline(tenantId: string, dias: number): Promise<{ key: string; count: number }[]> {
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);
    const rows = await this.orders
      .createQueryBuilder('o')
      .select('o.causaOffline', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere('o.causaOffline IS NOT NULL')
      .andWhere('o.fechaApe >= :desde', { desde })
      .groupBy('o.causaOffline')
      .orderBy('count', 'DESC')
      .getRawMany<{ key: string; count: string }>();
    return rows.map((r) => ({ key: r.key, count: Number(r.count) }));
  }

  /** Mapa de saturación por OLT (y opcionalmente por PON dentro de cada OLT). */
  private async groupByOltPon(
    tenantId: string,
    incluirPon: boolean,
  ): Promise<{ olt: string; pon: string; total: number; offline: number }[]> {
    const qb = this.orders
      .createQueryBuilder('o')
      .select("COALESCE(o.olt, '(sin dato)')", 'olt')
      .addSelect('COUNT(*)', 'total')
      .addSelect('SUM(CASE WHEN o.esOffline THEN 1 ELSE 0 END)', 'offline')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere("o.olt IS NOT NULL")
      .groupBy("COALESCE(o.olt, '(sin dato)')");
    if (incluirPon) {
      qb.addSelect("COALESCE(o.pon, '(sin dato)')", 'pon').addGroupBy("COALESCE(o.pon, '(sin dato)')");
    }
    qb.orderBy('offline', 'DESC').addOrderBy('total', 'DESC').limit(100);
    const rows = await qb.getRawMany<{ olt: string; pon?: string; total: string; offline: string }>();
    return rows.map((r) => ({
      olt: r.olt,
      pon: incluirPon ? (r.pon ?? '(sin dato)') : '',
      total: Number(r.total),
      offline: Number(r.offline),
    }));
  }

  /** Conteo agrupado por una columna, ordenado desc; los null se muestran como '(sin dato)'. */
  private async groupCount(
    tenantId: string,
    column: 'estado' | 'actividad' | 'motivo' | 'tecnico',
    limit?: number,
  ): Promise<{ key: string; count: number }[]> {
    const qb = this.orders
      .createQueryBuilder('o')
      .select(`COALESCE(o.${column}, '(sin dato)')`, 'key')
      .addSelect('COUNT(*)', 'count')
      .where('o.tenantId = :tenantId', { tenantId })
      .groupBy(`COALESCE(o.${column}, '(sin dato)')`)
      .orderBy('count', 'DESC');
    if (limit) qb.limit(limit);
    const rows = await qb.getRawMany<{ key: string; count: string }>();
    return rows.map((r) => ({ key: r.key, count: Number(r.count) }));
  }

  /**
   * Centro de Reportes: KPIs del día, tablero de carga (retraso + SOP/
   * Instalaciones/Plex) y consolidado por segmento. Portado de app.py — cada
   * corte usa el mismo universo "pendientes" que el Monitor, para que los
   * números no se desincronicen entre pantallas.
   */
  async getReportesBoard(tenantId: string): Promise<ReportesBoard> {
    const ahora = new Date();
    // Igual que el original: carga todo el dataset del tenant y clasifica en
    // memoria (la lógica de SOP/INS/PLEX no es expresable en SQL sin
    // duplicarla). Revisar si hace falta acotar por fecha cuando el volumen
    // real de órdenes lo justifique.
    const todas = await this.orders.find({ where: { tenantId } });

    const pendientes = todas
      .filter((o) => esPendienteMonitor(o))
      .map((o) => ({ ...o, dias: diasRetraso(o.fechaApe, o.tecnico, ahora) }));
    const pendientesAsignadas = pendientes.filter((o) => tieneTecnicoValido(o.tecnico));

    const cerradasHoy = todas.filter(
      (o) =>
        (o.estado ?? '').trim().toUpperCase() === 'CERRADA' &&
        ACTIVIDADES_PERMITIDAS.includes((o.actividad ?? '').trim().toUpperCase()) &&
        tieneTecnicoValido(o.tecnico) &&
        o.horaLiqAt != null &&
        esMismoDiaHonduras(o.horaLiqAt, ahora),
    );

    const kpis = {
      pendientesAsignadas: pendientesAsignadas.length,
      cerradasHoy: cerradasHoy.length,
      tecnicosEnRuta: new Set(pendientesAsignadas.map((o) => (o.tecnico as string).trim().toUpperCase())).size,
      caidasOffline: pendientes.filter((o) => o.esOffline).length,
      totalGeneral: pendientes.length,
    };

    const tablero = this.tableroDeCarga(pendientes);

    const segmentoDe = (o: { segmento: string | null }) => (o.segmento ?? '').trim().toUpperCase();
    const segmentos = {
      residencial: this.calcularSegmento(
        pendientesAsignadas.filter((o) => segmentoDe(o) === 'RESIDENCIAL'),
        cerradasHoy.filter((o) => segmentoDe(o) === 'RESIDENCIAL'),
        ahora,
      ),
      plex: this.calcularSegmento(
        pendientesAsignadas.filter((o) => segmentoDe(o) === 'PLEX'),
        cerradasHoy.filter((o) => segmentoDe(o) === 'PLEX'),
        ahora,
      ),
      global: this.calcularSegmento(pendientesAsignadas, cerradasHoy, ahora),
    };

    return { kpis, tablero, segmentos };
  }

  private tableroDeCarga(
    pendientes: (WorkOrder & { dias: number })[],
  ): ReportesBoard['tablero'] {
    const porRetraso = new Map<CategoriaRetraso, number>();
    for (const cat of CATEGORIAS_RETRASO) porRetraso.set(cat, 0);
    for (const o of pendientes) {
      const cat = categoriaRetraso(o.dias);
      porRetraso.set(cat, (porRetraso.get(cat) ?? 0) + 1);
    }

    const sop = new Map<string, number>();
    const instalaciones = new Map<string, number>();
    for (const cat of SUBTIPOS_INSTALACION) instalaciones.set(cat, 0);
    let excedenDosHoras = 0;

    for (const o of pendientes) {
      const { grupo, subtipo } = clasificarTablero(o.actividad, o.comentario, o.esOffline);
      if (grupo === 'SOP') {
        sop.set(subtipo, (sop.get(subtipo) ?? 0) + 1);
        if (o.alertaTiempo) excedenDosHoras += 1;
      } else if (grupo === 'INS') {
        instalaciones.set(subtipo, (instalaciones.get(subtipo) ?? 0) + 1);
      }
    }

    const plex = new Map<string, number>();
    for (const o of pendientes) {
      if (esPlex(o.actividad) && tieneTecnicoValido(o.tecnico)) {
        const actividad = (o.actividad ?? '').trim().toUpperCase();
        plex.set(actividad, (plex.get(actividad) ?? 0) + 1);
      }
    }

    const aLista = (m: Map<string, number>): ConteoEtiqueta[] =>
      [...m.entries()].map(([etiqueta, cantidad]) => ({ etiqueta, cantidad })).sort((a, b) => b.cantidad - a.cantidad);

    return {
      resumenRetraso: CATEGORIAS_RETRASO.map((categoria) => ({ categoria, cantidad: porRetraso.get(categoria) ?? 0 })),
      sop: aLista(sop),
      excedenDosHoras,
      instalaciones: SUBTIPOS_INSTALACION.map((etiqueta) => ({ etiqueta, cantidad: instalaciones.get(etiqueta) ?? 0 })),
      plex: aLista(plex),
    };
  }

  /** Universo "mora" (atrasado) vs. "hoy" (al día) para un segmento, y cuánto se cerró hoy. */
  private calcularSegmento(
    pendientesAsignadas: (WorkOrder & { dias: number })[],
    cerradasHoy: WorkOrder[],
    ahora: Date,
  ): SegmentoStats {
    const pMora = pendientesAsignadas.filter((o) => o.dias > 0).length;
    const pHoy = pendientesAsignadas.filter((o) => o.dias === 0).length;
    const cMora = cerradasHoy.filter((o) => o.fechaApe && esAntesDeHoyHonduras(o.fechaApe, ahora)).length;
    const cHoy = cerradasHoy.filter((o) => o.fechaApe && esMismoDiaHonduras(o.fechaApe, ahora)).length;

    const totalMora = pMora + cMora;
    const totalHoy = pHoy + cHoy;
    const totalGlobal = totalMora + totalHoy;
    const cerradasGlobal = cMora + cHoy;

    return {
      totalGlobal,
      cerradasGlobal,
      pctGlobal: totalGlobal > 0 ? (cerradasGlobal / totalGlobal) * 100 : 0,
      totalMora,
      cerradasMora: cMora,
      pctMora: totalMora > 0 ? (cMora / totalMora) * 100 : 0,
      totalHoy,
      cerradasHoy: cHoy,
      pctHoy: totalHoy > 0 ? (cHoy / totalHoy) * 100 : 0,
    };
  }
}
