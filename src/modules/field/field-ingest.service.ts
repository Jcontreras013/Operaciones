import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity';
import { IngestRun } from './entities/ingest-run.entity';
import { CEPHEUS_CONNECTOR, CepheusConnector, RawOrder } from './cepheus/cepheus-connector';
import { clasificarCausaOffline, computeOfflineFlags, esUniversoDiagnostico } from './offline';

/** Lee una clave (mayúsculas) de la orden cruda como string no vacío, o null. */
function str(raw: RawOrder, key: string): string | null {
  const v = raw[key];
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

/** Parsea 'dd/mm/aaaa [HH:MM]' o ISO a Date; null si no se puede. */
export function parseFecha(value: string | null): Date | null {
  if (!value) return null;
  const m = value.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/);
  if (m) {
    const [, dd, mm, yyyy, hh = '00', mi = '00'] = m;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd), Number(hh), Number(mi));
    return isNaN(d.getTime()) ? null : d;
  }
  const iso = new Date(value);
  return isNaN(iso.getTime()) ? null : iso;
}

/**
 * Combina una hora suelta ('HH:MM[:SS]', tal como la manda Cepheus para
 * HORA_INI/HORA_LIQ) con la fecha de apertura de la orden, para obtener una
 * marca de tiempo completa. Si `horaRaw` ya trae fecha propia, se usa esa.
 */
function combineFechaHora(fechaBase: Date | null, horaRaw: string | null): Date | null {
  if (!horaRaw) return null;
  const directo = parseFecha(horaRaw);
  if (directo) return directo;
  const m = horaRaw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (m && fechaBase) {
    const [, hh, mi, ss = '0'] = m;
    const d = new Date(fechaBase);
    d.setHours(Number(hh), Number(mi), Number(ss), 0);
    return d;
  }
  return null;
}

export interface IngestResult {
  fetched: number;
  created: number;
  updated: number;
  runId: string;
}

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
      status = 'error';
      error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Ingesta falló: ${error}`);
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

  listWorkOrders(
    tenantId: string,
    filters: { estado?: string; tecnico?: string; olt?: string; search?: string } = {},
  ): Promise<WorkOrder[]> {
    const where: FindOptionsWhere<WorkOrder> = { tenantId };
    if (filters.estado) where.estado = filters.estado;
    if (filters.tecnico) where.tecnico = ILike(`%${filters.tecnico}%`);
    if (filters.olt) where.olt = filters.olt;
    if (filters.search) where.externalNum = ILike(`%${filters.search}%`);
    return this.orders.find({ where, order: { fechaApe: 'DESC' }, take: 200 });
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

  /** Tablero del monitor: totales y agregados por estado, actividad y técnico. */
  async getBoard(tenantId: string): Promise<{
    total: number;
    byEstado: { key: string; count: number }[];
    byActividad: { key: string; count: number }[];
    byTecnico: { key: string; count: number }[];
    lastIngest: { ranAt: string; fetched: number; status: string } | null;
  }> {
    const total = await this.orders.count({ where: { tenantId } });
    const [byEstado, byActividad, byTecnico] = await Promise.all([
      this.groupCount(tenantId, 'estado'),
      this.groupCount(tenantId, 'actividad'),
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
    column: 'estado' | 'actividad' | 'tecnico',
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
}
