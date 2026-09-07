/** Cómo se ejecuta una ruta: con flota propia o con un carrier tercerizado. */
export enum AssignmentType {
  OWN = 'own',
  CARRIER = 'carrier',
}

/** Estado de una ruta de reparto. */
export enum RouteStatus {
  PLANNED = 'planned',
  DISPATCHED = 'dispatched',
  COMPLETED = 'completed',
}

/** Estado de una entrega (parada). */
export enum DeliveryStatus {
  /** Creada, sin asignar a una ruta. */
  PENDING = 'pending',
  /** Asignada a una ruta pero aún no despachada. */
  ASSIGNED = 'assigned',
  /** En reparto. */
  EN_ROUTE = 'en_route',
  /** Entregada (con prueba de entrega). */
  DELIVERED = 'delivered',
  /** Intento fallido. */
  FAILED = 'failed',
}
