/** Tipo de ubicación dentro del almacén. */
export enum LocationKind {
  RECEIVING = 'receiving',
  STORAGE = 'storage',
  STAGING = 'staging',
  SHIPPING = 'shipping',
}

/** Tipo de movimiento de inventario (log de auditoría). */
export enum MovementType {
  /** Ingreso de mercancía al almacén. */
  RECEIPT = 'receipt',
  /** Traslado entre ubicaciones (incluye putaway). */
  TRANSFER = 'transfer',
  /** Salida de mercancía (preparación/despacho). */
  PICK = 'pick',
  /** Ajuste manual de inventario. */
  ADJUST = 'adjust',
}
