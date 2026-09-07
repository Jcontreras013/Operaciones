import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Not, Repository } from 'typeorm';
import { Money } from '@common/money';
import { Operation, OperationStatus } from '@modules/operations/entities/operation.entity';
import { Document, DocumentType } from '@modules/operations/entities/document.entity';
import { CostItem } from '@modules/operations/entities/cost-item.entity';
import { ChargeItem } from '@modules/billing/entities/charge-item.entity';

/** Estados que se consideran "cerrados" (no cuentan como activos ni como demorados). */
const CLOSED_STATUSES = [OperationStatus.DELIVERED, OperationStatus.CLOSED];

export type ExceptionType = 'stale' | 'missing_pod';

export interface ExceptionRow {
  type: ExceptionType;
  operationId: string;
  reference: string;
  clientId: string;
  status: OperationStatus;
  detail: string;
}

/**
 * Torre de visibilidad (E5): lado de lectura que se alimenta del registro único
 * y de la facturación. No escribe estado de negocio; solo consulta y agrega.
 */
@Injectable()
export class VisibilityService {
  constructor(
    @InjectRepository(Operation) private readonly operations: Repository<Operation>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(CostItem) private readonly costs: Repository<CostItem>,
    @InjectRepository(ChargeItem) private readonly charges: Repository<ChargeItem>,
  ) {}

  /** Tablero: conteo por estado + operaciones recientes (US5.1). */
  async getBoard(
    tenantId: string,
    clientId?: string,
  ): Promise<{
    byStatus: Record<string, number>;
    total: number;
    operations: Operation[];
  }> {
    const where = clientId ? { tenantId, clientId } : { tenantId };

    const rawCounts = await this.operations
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('o.tenantId = :tenantId', { tenantId })
      .andWhere(clientId ? 'o.clientId = :clientId' : '1=1', { clientId })
      .groupBy('o.status')
      .getRawMany<{ status: string; count: string }>();

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of rawCounts) {
      const n = Number(row.count);
      byStatus[row.status] = n;
      total += n;
    }

    const operations = await this.operations.find({
      where,
      order: { updatedAt: 'DESC' },
      take: 50,
    });

    return { byStatus, total, operations };
  }

  /**
   * Alertas de excepción (US5.2):
   *  - `stale`: operación abierta sin actividad en más de `staleHours` horas.
   *  - `missing_pod`: operación entregada sin prueba de entrega adjunta.
   */
  async getExceptions(tenantId: string, staleHours = 24): Promise<ExceptionRow[]> {
    const threshold = new Date(Date.now() - staleHours * 60 * 60 * 1000);

    const stale = await this.operations.find({
      where: {
        tenantId,
        status: Not(In(CLOSED_STATUSES)),
        updatedAt: LessThan(threshold),
      },
      order: { updatedAt: 'ASC' },
    });

    const delivered = await this.operations.find({
      where: { tenantId, status: OperationStatus.DELIVERED },
    });
    const deliveredIds = delivered.map((o) => o.id);

    let withPod = new Set<string>();
    if (deliveredIds.length > 0) {
      const pods = await this.documents.find({
        where: {
          tenantId,
          operationId: In(deliveredIds),
          type: DocumentType.PROOF_OF_DELIVERY,
        },
      });
      withPod = new Set(pods.map((d) => d.operationId));
    }

    const exceptions: ExceptionRow[] = [];
    for (const op of stale) {
      exceptions.push({
        type: 'stale',
        operationId: op.id,
        reference: op.reference,
        clientId: op.clientId,
        status: op.status,
        detail: `Sin actividad desde ${op.updatedAt.toISOString()} (> ${staleHours}h)`,
      });
    }
    for (const op of delivered) {
      if (!withPod.has(op.id)) {
        exceptions.push({
          type: 'missing_pod',
          operationId: op.id,
          reference: op.reference,
          clientId: op.clientId,
          status: op.status,
          detail: 'Operación entregada sin prueba de entrega (POD)',
        });
      }
    }
    return exceptions;
  }

  /** KPIs de un cliente (US5.3): actividad e ingresos/costos/margen. */
  async getClientKpis(
    tenantId: string,
    clientId: string,
  ): Promise<{
    totalOperations: number;
    activeOperations: number;
    deliveredOperations: number;
    revenueMinor: string;
    costMinor: string;
    marginMinor: string;
  }> {
    const [total, active, delivered] = await Promise.all([
      this.operations.count({ where: { tenantId, clientId } }),
      this.operations.count({ where: { tenantId, clientId, status: Not(In(CLOSED_STATUSES)) } }),
      this.operations.count({ where: { tenantId, clientId, status: OperationStatus.DELIVERED } }),
    ]);

    const revenueMinor = await this.sumRevenue(tenantId, clientId);
    const costMinor = await this.sumCosts(tenantId, clientId);
    const marginMinor = (BigInt(revenueMinor) - BigInt(costMinor)).toString();

    return {
      totalOperations: total,
      activeOperations: active,
      deliveredOperations: delivered,
      revenueMinor,
      costMinor,
      marginMinor,
    };
  }

  /** Suma de los cargos (ingresos) de un cliente. */
  private async sumRevenue(tenantId: string, clientId: string): Promise<string> {
    const rows = await this.charges.find({ where: { tenantId, clientId } });
    return Money.sum(rows.map((r) => r.amountMinor));
  }

  /** Suma de costos reales: los CostItem cuelgan de la operación, no del cliente. */
  private async sumCosts(tenantId: string, clientId: string): Promise<string> {
    const rows = await this.costs
      .createQueryBuilder('c')
      .innerJoin(Operation, 'o', 'o.id = c.operationId')
      .select('c.amountMinor', 'amountMinor')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('o.clientId = :clientId', { clientId })
      .getRawMany<{ amountMinor: string }>();
    return Money.sum(rows.map((r) => r.amountMinor));
  }
}
