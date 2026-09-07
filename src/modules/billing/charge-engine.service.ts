import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EventsService } from '@modules/events/events.service';
import { DomainEvent, DomainEventType } from '@modules/events/event-types';
import { OperationsService } from '@modules/operations/operations.service';
import { OperationStatus } from '@modules/operations/entities/operation.entity';
import { BillingService } from './billing.service';
import { ChargeType } from './billing.enums';

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/**
 * Motor de cargos: deriva ChargeItems desde los eventos del dominio (US3.2).
 *
 * Este es el enganche entre el bus de eventos (E6) y la facturación (E3): el
 * cargo se calcula a partir de un evento y una regla de la rate card, nunca por
 * re-captura. Se suscribe en el arranque y corre después del commit.
 */
@Injectable()
export class ChargeEngine implements OnModuleInit {
  private readonly logger = new Logger(ChargeEngine.name);

  constructor(
    private readonly events: EventsService,
    private readonly billing: BillingService,
    private readonly operations: OperationsService,
  ) {}

  onModuleInit(): void {
    this.events.on(DomainEventType.OPERATION_CREATED, (e) => this.onOperationCreated(e));
    this.events.on(DomainEventType.OPERATION_MILESTONE_ADDED, (e) => this.onMilestone(e));
    // Facturación por actividad derivada de la operación física (Fase 1):
    this.events.on(DomainEventType.WAREHOUSE_RECEIPT, (e) =>
      this.onActivity(e, ChargeType.HANDLING),
    );
    this.events.on(DomainEventType.WAREHOUSE_PICK, (e) =>
      this.onActivity(e, ChargeType.PICK_PACK),
    );
    this.events.on(DomainEventType.DELIVERY_DELIVERED, (e) =>
      this.onActivity(e, ChargeType.LAST_MILE),
    );
  }

  /**
   * Cargo por actividad: un evento operativo (recepción/pick/entrega) genera un
   * cargo si la rate card del cliente tiene una regla de ese tipo SIN
   * triggerStatus (las reglas con triggerStatus se disparan por hitos de la
   * operación, no por actividad física). La cantidad sale del payload del
   * evento (unidades movidas; 1 en la entrega).
   */
  private async onActivity(event: DomainEvent, chargeType: ChargeType): Promise<void> {
    const tenantId = event.tenantId;
    const clientId = event.payload.clientId as string | undefined;
    if (!clientId) {
      return;
    }
    const card = await this.billing.getActiveRateCard(tenantId, clientId);
    if (!card) {
      return;
    }
    const rules = await this.billing.getRules(tenantId, card.id);
    const rule = rules.find((r) => r.chargeType === chargeType && r.triggerStatus === null);
    if (!rule) {
      return; // La rate card no cobra esta actividad.
    }

    const quantity =
      typeof event.payload.quantity === 'number' ? (event.payload.quantity as number) : 1;
    const operationId =
      typeof event.payload.operationId === 'string'
        ? (event.payload.operationId as string)
        : null;

    await this.billing.createCharge({
      tenantId,
      clientId,
      operationId,
      chargeType,
      description: rule.description,
      quantity,
      rateMinor: rule.rateMinor,
      currency: card.currency,
      rateRuleId: rule.id,
      source: event.type,
    });
  }

  /** Al crear la operación: aplica las reglas PER_SERVICE (monto fijo). */
  private async onOperationCreated(event: DomainEvent): Promise<void> {
    const tenantId = event.tenantId;
    const operationId = event.entityId;
    const clientId = event.payload.clientId as string | undefined;
    if (!clientId) {
      return;
    }

    const card = await this.billing.getActiveRateCard(tenantId, clientId);
    if (!card) {
      return; // Sin rate card no hay cargos automáticos.
    }
    const rules = await this.billing.getRules(tenantId, card.id);

    for (const rule of rules) {
      if (rule.chargeType === ChargeType.PER_SERVICE && rule.triggerStatus === null) {
        await this.billing.createCharge({
          tenantId,
          clientId,
          operationId,
          chargeType: ChargeType.PER_SERVICE,
          description: rule.description,
          quantity: 1,
          rateMinor: rule.rateMinor,
          currency: card.currency,
          rateRuleId: rule.id,
        });
      }
    }
  }

  /**
   * En cada hito: aplica las reglas cuyo triggerStatus coincide (handling), y
   * al entregar/cerrar calcula el almacenaje por días si hay regla STORAGE.
   */
  private async onMilestone(event: DomainEvent): Promise<void> {
    const tenantId = event.tenantId;
    const operationId = event.entityId;
    const status = event.payload.status as OperationStatus | undefined;
    if (!status) {
      return;
    }

    const operation = await this.operations.get(tenantId, operationId);
    const card = await this.billing.getActiveRateCard(tenantId, operation.clientId);
    if (!card) {
      return;
    }
    const rules = await this.billing.getRules(tenantId, card.id);

    // Reglas disparadas por este estado (típicamente HANDLING).
    for (const rule of rules) {
      if (rule.triggerStatus === status && rule.chargeType !== ChargeType.STORAGE) {
        await this.billing.createCharge({
          tenantId,
          clientId: operation.clientId,
          operationId,
          chargeType: rule.chargeType,
          description: rule.description,
          quantity: 1,
          rateMinor: rule.rateMinor,
          currency: card.currency,
          rateRuleId: rule.id,
        });
      }
    }

    // Almacenaje: al entregar o cerrar, cobra los días en almacén.
    if (status === OperationStatus.DELIVERED || status === OperationStatus.CLOSED) {
      const storageRule = rules.find((r) => r.chargeType === ChargeType.STORAGE);
      if (storageRule) {
        await this.chargeStorage(tenantId, operation.clientId, operationId, card.currency, storageRule.id, storageRule.rateMinor, storageRule.description);
      }
    }
  }

  private async chargeStorage(
    tenantId: string,
    clientId: string,
    operationId: string,
    currency: string,
    rateRuleId: string,
    rateMinor: string,
    description: string,
  ): Promise<void> {
    const milestones = await this.operations.getMilestones(tenantId, operationId);
    const inWarehouse = milestones.find((m) => m.status === OperationStatus.IN_WAREHOUSE);
    if (!inWarehouse) {
      return; // Nunca estuvo en almacén.
    }
    const exit = milestones
      .filter(
        (m) =>
          (m.status === OperationStatus.DELIVERED || m.status === OperationStatus.CLOSED) &&
          m.occurredAt > inWarehouse.occurredAt,
      )
      .sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime())[0];
    if (!exit) {
      return;
    }

    const diffMs = exit.occurredAt.getTime() - inWarehouse.occurredAt.getTime();
    const days = Math.max(1, Math.ceil(diffMs / MS_PER_DAY));

    // Evita duplicar el almacenaje si ya se cobró para esta operación.
    const existing = await this.billing.listCharges(tenantId, operationId);
    if (existing.some((c) => c.chargeType === ChargeType.STORAGE)) {
      this.logger.debug(`Almacenaje ya cobrado para la operación ${operationId}`);
      return;
    }

    await this.billing.createCharge({
      tenantId,
      clientId,
      operationId,
      chargeType: ChargeType.STORAGE,
      description: `${description} (${days} día(s))`,
      quantity: days,
      rateMinor,
      currency,
      rateRuleId,
    });
  }
}
