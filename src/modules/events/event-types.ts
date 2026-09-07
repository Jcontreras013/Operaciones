/**
 * Tipos de evento del dominio. Todo cambio relevante en una operación emite
 * uno de estos; facturación, visibilidad y (a futuro) la IA de ejecución se
 * suscriben sin acoplarse al dominio que los origina.
 */
export enum DomainEventType {
  OPERATION_CREATED = 'operation.created',
  OPERATION_MILESTONE_ADDED = 'operation.milestone_added',
  OPERATION_DOCUMENT_ADDED = 'operation.document_added',
  OPERATION_COST_ADDED = 'operation.cost_added',
  CLIENT_CREATED = 'client.created',
  INVOICE_EXPORTED = 'invoice.exported',
  WAREHOUSE_RECEIPT = 'warehouse.receipt',
  WAREHOUSE_TRANSFER = 'warehouse.transfer',
  WAREHOUSE_PICK = 'warehouse.pick',
  DELIVERY_CREATED = 'delivery.created',
  ROUTE_DISPATCHED = 'route.dispatched',
  DELIVERY_DELIVERED = 'delivery.delivered',
  DELIVERY_FAILED = 'delivery.failed',
}

/** Forma del payload que se persiste en el outbox y se despacha en memoria. */
export interface DomainEvent<T = Record<string, unknown>> {
  tenantId: string;
  type: DomainEventType;
  /** Nombre de la entidad de origen, p. ej. "Operation". */
  entity: string;
  entityId: string;
  payload: T;
  occurredAt: Date;
}
