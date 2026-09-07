/** Tipos de cargo soportados en la Fase 0 (ver docs/fase-0). */
export enum ChargeType {
  /** Monto fijo por servicio contratado. */
  PER_SERVICE = 'per_service',
  /** Almacenaje: tarifa por día por unidad. */
  STORAGE = 'storage',
  /** Handling: tarifa por movimiento (recepción/despacho). */
  HANDLING = 'handling',
  /** Pick & pack: tarifa por ítem/orden. */
  PICK_PACK = 'pick_pack',
  /** Valor agregado (VAS): cargo manual del operador. */
  VAS = 'vas',
}

/** Unidad de cobro de una regla de tarifa. */
export enum RateUnit {
  FLAT = 'flat',
  PER_DAY = 'per_day',
  PER_MOVEMENT = 'per_movement',
  PER_ITEM = 'per_item',
  PER_UNIT = 'per_unit',
}

/** Estado de una factura al cliente. */
export enum InvoiceStatus {
  DRAFT = 'draft',
  APPROVED = 'approved',
  ISSUED = 'issued',
}

/** Resultado de un intento de exportación de factura al ERP (US3.5). */
export enum InvoiceExportStatus {
  EXPORTED = 'exported',
  FAILED = 'failed',
}

/** Estado de una factura recibida de un carrier (US3.4). */
export enum CarrierInvoiceStatus {
  /** Registrada, aún sin conciliar. */
  PENDING = 'pending',
  /** Conciliada sin discrepancias (dentro de la tolerancia). */
  RECONCILED = 'reconciled',
  /** Conciliada con discrepancias respecto a los costos registrados. */
  DISPUTED = 'disputed',
}
