import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, Repository } from 'typeorm';
import { WorkOrder } from './entities/work-order.entity';
import { IngestRun } from './entities/ingest-run.entity';
import { CEPHEUS_CONNECTOR, CepheusConnector, RawOrder } from './cepheus/cepheus-connector';

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
          const fields = {
            tenantId,
            externalNum,
            cliente: str(raw, 'CLIENTE'),
            tecnico: str(raw, 'TECNICO'),
            actividad: str(raw, 'ACTIVIDAD'),
            estado: str(raw, 'ESTADO'),
            tipoOrden: str(raw, 'TIPOORDEN'),
            subtipo: str(raw, 'SUBTIPO'),
            segmento: str(raw, 'SEGMENTO'),
            grupo: str(raw, 'GRUPO'),
            colonia: str(raw, 'COLONIA'),
            olt: str(raw, 'OLT'),
            pon: str(raw, 'PON'),
            causa: str(raw, 'CAUSA'),
            motivo: str(raw, 'MOTIVO'),
            comentario: str(raw, 'COMENTARIO'),
            atribucion: str(raw, 'ATRIBUCION'),
            gps: str(raw, 'GPS'),
            mxref: str(raw, 'MXREF'),
            fechaApeRaw,
            fechaApe: parseFecha(fechaApeRaw),
            horaIni: str(raw, 'HORA_INI'),
            horaLiq: str(raw, 'HORA_LIQ'),
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
}
