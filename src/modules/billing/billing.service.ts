import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, DataSource, In, IsNull, Repository } from 'typeorm';
import { Money } from '@common/money';
import { OperationsService } from '@modules/operations/operations.service';
import { CostItem } from '@modules/operations/entities/cost-item.entity';
import { EventsService } from '@modules/events/events.service';
import { DomainEventType } from '@modules/events/event-types';
import { RateCard } from './entities/rate-card.entity';
import { RateRule } from './entities/rate-rule.entity';
import { ChargeItem } from './entities/charge-item.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { CarrierInvoice } from './entities/carrier-invoice.entity';
import { CarrierInvoiceLine } from './entities/carrier-invoice-line.entity';
import { InvoiceExport } from './entities/invoice-export.entity';
import { CarrierInvoiceStatus, InvoiceExportStatus, InvoiceStatus } from './billing.enums';
import { CreateRateCardDto } from './dto/create-rate-card.dto';
import { AddChargeDto } from './dto/add-charge.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { RegisterCarrierInvoiceDto } from './dto/register-carrier-invoice.dto';
import { ERP_CONNECTOR, ErpConnector, ErpInvoicePayload } from './erp/erp-connector';

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(RateCard) private readonly rateCards: Repository<RateCard>,
    @InjectRepository(RateRule) private readonly rateRules: Repository<RateRule>,
    @InjectRepository(ChargeItem) private readonly charges: Repository<ChargeItem>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(InvoiceLine) private readonly invoiceLines: Repository<InvoiceLine>,
    @InjectRepository(CostItem) private readonly costs: Repository<CostItem>,
    @InjectRepository(CarrierInvoice)
    private readonly carrierInvoices: Repository<CarrierInvoice>,
    @InjectRepository(CarrierInvoiceLine)
    private readonly carrierInvoiceLines: Repository<CarrierInvoiceLine>,
    @InjectRepository(InvoiceExport)
    private readonly invoiceExports: Repository<InvoiceExport>,
    private readonly operations: OperationsService,
    private readonly events: EventsService,
    @Inject(ERP_CONNECTOR) private readonly erp: ErpConnector,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------------------
  // Rate cards (US3.1)
  // ---------------------------------------------------------------------------

  /** Crea una rate card con sus reglas y la deja como la activa del cliente. */
  async createRateCard(
    tenantId: string,
    clientId: string,
    dto: CreateRateCardDto,
  ): Promise<RateCard> {
    const currency = dto.currency ?? 'USD';

    return this.dataSource.transaction(async (manager) => {
      // Solo una rate card activa por cliente.
      await manager
        .getRepository(RateCard)
        .update({ tenantId, clientId, active: true }, { active: false });

      const card = await manager.getRepository(RateCard).save({
        tenantId,
        clientId,
        name: dto.name,
        currency,
        active: true,
      });

      await manager.getRepository(RateRule).save(
        dto.rules.map((rule) => ({
          tenantId,
          rateCardId: card.id,
          chargeType: rule.chargeType,
          description: rule.description,
          rateMinor: String(rule.rateMinor),
          unit: rule.unit,
          triggerStatus: rule.triggerStatus ?? null,
          active: true,
        })),
      );

      return card;
    });
  }

  /** Rate card activa de un cliente, o null si no tiene. */
  getActiveRateCard(tenantId: string, clientId: string): Promise<RateCard | null> {
    return this.rateCards.findOne({ where: { tenantId, clientId, active: true } });
  }

  getRules(tenantId: string, rateCardId: string): Promise<RateRule[]> {
    return this.rateRules.find({ where: { tenantId, rateCardId, active: true } });
  }

  async listRateCards(tenantId: string, clientId: string): Promise<RateCard[]> {
    return this.rateCards.find({
      where: { tenantId, clientId },
      order: { createdAt: 'DESC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Cargos (US3.2)
  // ---------------------------------------------------------------------------

  /**
   * Crea un cargo. Si `rateMinor` no viene, lo resuelve desde la regla del tipo
   * indicado en la rate card activa del cliente. Usado tanto por el motor
   * (automático) como por la ruta manual (VAS, pick&pack, ajustes).
   */
  async createCharge(params: {
    tenantId: string;
    clientId: string;
    operationId?: string | null;
    chargeType: ChargeItem['chargeType'];
    description: string;
    quantity: number;
    rateMinor?: number | string;
    currency?: string;
    rateRuleId?: string | null;
    source?: string | null;
  }): Promise<ChargeItem> {
    let rateMinor = params.rateMinor;
    let currency = params.currency;
    let rateRuleId = params.rateRuleId ?? null;

    if (rateMinor === undefined) {
      const card = await this.getActiveRateCard(params.tenantId, params.clientId);
      if (!card) {
        throw new BadRequestException('El cliente no tiene una rate card activa');
      }
      const rules = await this.getRules(params.tenantId, card.id);
      const rule = rules.find((r) => r.chargeType === params.chargeType);
      if (!rule) {
        throw new BadRequestException(
          `La rate card no tiene una regla para el cargo "${params.chargeType}"`,
        );
      }
      rateMinor = rule.rateMinor;
      currency = currency ?? card.currency;
      rateRuleId = rule.id;
    }

    return this.charges.save({
      tenantId: params.tenantId,
      clientId: params.clientId,
      operationId: params.operationId ?? null,
      source: params.source ?? null,
      chargeType: params.chargeType,
      description: params.description,
      quantity: params.quantity,
      rateMinor: String(rateMinor),
      amountMinor: Money.multiply(rateMinor, params.quantity),
      currency: currency ?? 'USD',
      rateRuleId,
      invoiceId: null,
    });
  }

  /** Cargo manual contra una operación (resuelve el cliente desde la operación). */
  async addManualCharge(
    tenantId: string,
    operationId: string,
    dto: AddChargeDto,
  ): Promise<ChargeItem> {
    const operation = await this.operations.get(tenantId, operationId);
    return this.createCharge({
      tenantId,
      clientId: operation.clientId,
      operationId: operation.id,
      chargeType: dto.chargeType,
      description: dto.description,
      quantity: dto.quantity,
      rateMinor: dto.rateMinor,
      currency: dto.currency,
    });
  }

  listCharges(tenantId: string, operationId: string): Promise<ChargeItem[]> {
    return this.charges.find({
      where: { tenantId, operationId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Cargos de un cliente (incluye los de actividad sin operación). */
  listClientCharges(
    tenantId: string,
    clientId: string,
    onlyPending = false,
  ): Promise<ChargeItem[]> {
    return this.charges.find({
      where: onlyPending
        ? { tenantId, clientId, invoiceId: IsNull() }
        : { tenantId, clientId },
      order: { createdAt: 'ASC' },
    });
  }

  // ---------------------------------------------------------------------------
  // Facturas (US3.3)
  // ---------------------------------------------------------------------------

  /**
   * Genera una factura draft con los cargos pendientes del cliente en el período.
   * Enlaza los cargos a la factura para que no se facturen dos veces.
   */
  async generateInvoice(tenantId: string, dto: GenerateInvoiceDto): Promise<Invoice> {
    const periodStart = new Date(dto.periodStart);
    const periodEnd = new Date(dto.periodEnd);
    if (periodEnd < periodStart) {
      throw new BadRequestException('periodEnd no puede ser anterior a periodStart');
    }

    return this.dataSource.transaction(async (manager) => {
      const pending = await manager.getRepository(ChargeItem).find({
        where: {
          tenantId,
          clientId: dto.clientId,
          invoiceId: IsNull(),
          createdAt: Between(periodStart, periodEnd),
        },
        order: { createdAt: 'ASC' },
      });

      if (pending.length === 0) {
        throw new BadRequestException('No hay cargos pendientes para el cliente en el período');
      }

      const currency = pending[0].currency;
      const count = await manager.getRepository(Invoice).count({ where: { tenantId } });
      const number = `INV-${String(count + 1).padStart(6, '0')}`;
      const totalMinor = Money.sum(pending.map((c) => c.amountMinor));

      const invoice = await manager.getRepository(Invoice).save({
        tenantId,
        clientId: dto.clientId,
        number,
        periodStart,
        periodEnd,
        status: InvoiceStatus.DRAFT,
        currency,
        totalMinor,
        issuedAt: null,
      });

      await manager.getRepository(InvoiceLine).save(
        pending.map((c) => ({
          tenantId,
          invoiceId: invoice.id,
          chargeItemId: c.id,
          description: c.description,
          quantity: c.quantity,
          rateMinor: c.rateMinor,
          amountMinor: c.amountMinor,
        })),
      );

      await manager
        .getRepository(ChargeItem)
        .update(
          { tenantId, id: In(pending.map((c) => c.id)) },
          { invoiceId: invoice.id },
        );

      return invoice;
    });
  }

  async approveInvoice(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.getInvoice(tenantId, id);
    if (invoice.status !== InvoiceStatus.DRAFT) {
      throw new BadRequestException('Solo se puede aprobar una factura en estado draft');
    }
    invoice.status = InvoiceStatus.APPROVED;
    return this.invoices.save(invoice);
  }

  async issueInvoice(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.getInvoice(tenantId, id);
    if (invoice.status !== InvoiceStatus.APPROVED) {
      throw new BadRequestException('Solo se puede emitir una factura aprobada');
    }
    invoice.status = InvoiceStatus.ISSUED;
    invoice.issuedAt = new Date();
    return this.invoices.save(invoice);
  }

  listInvoices(tenantId: string, clientId?: string): Promise<Invoice[]> {
    return this.invoices.find({
      where: clientId ? { tenantId, clientId } : { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInvoice(tenantId: string, id: string): Promise<Invoice> {
    const invoice = await this.invoices.findOne({ where: { tenantId, id } });
    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }
    return invoice;
  }

  getInvoiceLines(tenantId: string, invoiceId: string): Promise<InvoiceLine[]> {
    return this.invoiceLines.find({ where: { tenantId, invoiceId } });
  }

  // ---------------------------------------------------------------------------
  // Conciliación de facturas de carrier (US3.4)
  // ---------------------------------------------------------------------------

  /** Registra una factura de carrier con sus líneas (una por operación). */
  async registerCarrierInvoice(
    tenantId: string,
    dto: RegisterCarrierInvoiceDto,
  ): Promise<CarrierInvoice> {
    // Valida que cada operación pertenezca al tenant.
    for (const line of dto.lines) {
      await this.operations.get(tenantId, line.operationId);
    }
    const currency = dto.currency ?? 'USD';
    const declaredMinor = Money.sum(dto.lines.map((l) => String(l.declaredMinor)));

    return this.dataSource.transaction(async (manager) => {
      const invoice = await manager.getRepository(CarrierInvoice).save({
        tenantId,
        supplier: dto.supplier,
        number: dto.number,
        currency,
        declaredMinor,
        status: CarrierInvoiceStatus.PENDING,
        reconciledAt: null,
        note: null,
      });

      await manager.getRepository(CarrierInvoiceLine).save(
        dto.lines.map((l) => ({
          tenantId,
          carrierInvoiceId: invoice.id,
          operationId: l.operationId,
          concept: l.concept,
          declaredMinor: String(l.declaredMinor),
          recordedMinor: null,
          varianceMinor: null,
        })),
      );

      return invoice;
    });
  }

  /**
   * Concilia una factura de carrier contra los costos registrados (US3.4).
   * Para cada línea compara lo declarado por el carrier con la suma de los
   * CostItem de esa operación para el mismo proveedor, y calcula la variación.
   * Marca la factura RECONCILED si toda variación cae dentro de la tolerancia,
   * o DISPUTED si hay discrepancias.
   */
  async reconcileCarrierInvoice(
    tenantId: string,
    id: string,
    toleranceMinor = 0,
  ): Promise<{
    invoice: CarrierInvoice;
    lines: CarrierInvoiceLine[];
    totalDeclaredMinor: string;
    totalRecordedMinor: string;
    totalVarianceMinor: string;
    discrepancies: number;
  }> {
    const invoice = await this.getCarrierInvoice(tenantId, id);
    const lines = await this.carrierInvoiceLines.find({
      where: { tenantId, carrierInvoiceId: id },
      order: { createdAt: 'ASC' },
    });

    const tolerance = BigInt(toleranceMinor);
    let discrepancies = 0;

    await this.dataSource.transaction(async (manager) => {
      for (const line of lines) {
        const recorded = await this.sumCostForOperationSupplier(
          tenantId,
          line.operationId,
          invoice.supplier,
        );
        const variance = BigInt(line.declaredMinor) - BigInt(recorded);
        line.recordedMinor = recorded;
        line.varianceMinor = variance.toString();
        if (variance > tolerance || variance < -tolerance) {
          discrepancies += 1;
        }
        await manager.getRepository(CarrierInvoiceLine).save(line);
      }

      invoice.status =
        discrepancies === 0 ? CarrierInvoiceStatus.RECONCILED : CarrierInvoiceStatus.DISPUTED;
      invoice.reconciledAt = new Date();
      await manager.getRepository(CarrierInvoice).save(invoice);
    });

    return {
      invoice,
      lines,
      totalDeclaredMinor: Money.sum(lines.map((l) => l.declaredMinor)),
      totalRecordedMinor: Money.sum(lines.map((l) => l.recordedMinor ?? '0')),
      totalVarianceMinor: Money.sum(lines.map((l) => l.varianceMinor ?? '0')),
      discrepancies,
    };
  }

  listCarrierInvoices(tenantId: string): Promise<CarrierInvoice[]> {
    return this.carrierInvoices.find({ where: { tenantId }, order: { createdAt: 'DESC' } });
  }

  async getCarrierInvoice(tenantId: string, id: string): Promise<CarrierInvoice> {
    const invoice = await this.carrierInvoices.findOne({ where: { tenantId, id } });
    if (!invoice) {
      throw new NotFoundException('Factura de carrier no encontrada');
    }
    return invoice;
  }

  getCarrierInvoiceLines(tenantId: string, carrierInvoiceId: string): Promise<CarrierInvoiceLine[]> {
    return this.carrierInvoiceLines.find({
      where: { tenantId, carrierInvoiceId },
      order: { createdAt: 'ASC' },
    });
  }

  /**
   * Situación financiera de una operación (soporta la verificación de margen
   * antes de facturar): ingresos (cargos) − costos = margen.
   */
  async getOperationFinancials(
    tenantId: string,
    operationId: string,
  ): Promise<{ revenueMinor: string; costMinor: string; marginMinor: string }> {
    await this.operations.get(tenantId, operationId); // valida pertenencia
    const [charges, costs] = await Promise.all([
      this.charges.find({ where: { tenantId, operationId } }),
      this.costs.find({ where: { tenantId, operationId } }),
    ]);
    const revenueMinor = Money.sum(charges.map((c) => c.amountMinor));
    const costMinor = Money.sum(costs.map((c) => c.amountMinor));
    const marginMinor = (BigInt(revenueMinor) - BigInt(costMinor)).toString();
    return { revenueMinor, costMinor, marginMinor };
  }

  /** Suma de los CostItem de una operación para un proveedor dado. */
  private async sumCostForOperationSupplier(
    tenantId: string,
    operationId: string,
    supplier: string,
  ): Promise<string> {
    const items = await this.costs.find({ where: { tenantId, operationId, supplier } });
    return Money.sum(items.map((c) => c.amountMinor));
  }

  // ---------------------------------------------------------------------------
  // Export a ERP (US3.5)
  // ---------------------------------------------------------------------------

  /**
   * Exporta una factura emitida al ERP a través del conector configurado.
   * Es idempotente: si la factura ya se exportó con éxito, devuelve ese
   * registro sin volver a enviarla. Cada intento (éxito o fallo) queda auditado.
   */
  async exportInvoice(tenantId: string, invoiceId: string): Promise<InvoiceExport> {
    const invoice = await this.getInvoice(tenantId, invoiceId);
    if (invoice.status !== InvoiceStatus.ISSUED) {
      throw new BadRequestException('Solo se pueden exportar facturas emitidas (issued)');
    }

    const already = await this.invoiceExports.findOne({
      where: { tenantId, invoiceId, status: InvoiceExportStatus.EXPORTED },
    });
    if (already) {
      return already;
    }

    const lines = await this.getInvoiceLines(tenantId, invoiceId);
    const payload: ErpInvoicePayload = {
      tenantId,
      invoiceNumber: invoice.number,
      clientId: invoice.clientId,
      currency: invoice.currency,
      totalMinor: invoice.totalMinor,
      issuedAt: invoice.issuedAt ? invoice.issuedAt.toISOString() : null,
      lines: lines.map((l) => ({
        description: l.description,
        quantity: l.quantity,
        rateMinor: l.rateMinor,
        amountMinor: l.amountMinor,
      })),
    };

    try {
      const result = await this.erp.export(payload);
      const record = await this.invoiceExports.save({
        tenantId,
        invoiceId,
        status: InvoiceExportStatus.EXPORTED,
        externalRef: result.externalRef,
        payload: payload as unknown as Record<string, unknown>,
        error: null,
        exportedAt: new Date(),
      });
      await this.events.publish({
        tenantId,
        type: DomainEventType.INVOICE_EXPORTED,
        entity: 'Invoice',
        entityId: invoiceId,
        payload: { externalRef: result.externalRef, number: invoice.number },
        occurredAt: new Date(),
      });
      return record;
    } catch (err) {
      // Se persiste el intento fallido para auditoría; el estado lo refleja.
      return this.invoiceExports.save({
        tenantId,
        invoiceId,
        status: InvoiceExportStatus.FAILED,
        externalRef: null,
        payload: payload as unknown as Record<string, unknown>,
        error: err instanceof Error ? err.message : String(err),
        exportedAt: null,
      });
    }
  }

  /** Último intento de exportación de una factura. */
  async getInvoiceExport(tenantId: string, invoiceId: string): Promise<InvoiceExport> {
    const record = await this.invoiceExports.findOne({
      where: { tenantId, invoiceId },
      order: { createdAt: 'DESC' },
    });
    if (!record) {
      throw new NotFoundException('La factura no tiene exportaciones registradas');
    }
    return record;
  }
}
