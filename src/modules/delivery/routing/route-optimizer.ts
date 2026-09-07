/**
 * Puerto del optimizador de rutas (Fase 1).
 *
 * El servicio de reparto depende de esta interfaz, no de un optimizador
 * concreto. La Fase 1 provee un NearestNeighborOptimizer; un proveedor real
 * (SimpliRoute, Locus, Google OR-Tools, etc.) se enchufa sin tocar el resto.
 */

/** Parada a ordenar. Las coordenadas son opcionales. */
export interface OptimizerStop {
  id: string;
  lat: number | null;
  lng: number | null;
}

export interface OptimizerInput {
  /** Punto de partida (depósito), opcional. */
  origin?: { lat: number; lng: number };
  stops: OptimizerStop[];
}

export interface OptimizerResult {
  /** Ids de las paradas en el orden óptimo. */
  orderedStopIds: string[];
  /** Distancia total estimada de la ruta, en km. */
  estimatedKm: number;
}

export interface RouteOptimizer {
  optimize(input: OptimizerInput): OptimizerResult;
}

/** Token de inyección del optimizador. */
export const ROUTE_OPTIMIZER = Symbol('ROUTE_OPTIMIZER');
