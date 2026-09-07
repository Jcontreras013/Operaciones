import { Injectable } from '@nestjs/common';
import {
  OptimizerInput,
  OptimizerResult,
  OptimizerStop,
  RouteOptimizer,
} from './route-optimizer';

const EARTH_RADIUS_KM = 6371;

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/** Distancia haversine (km) entre dos coordenadas. */
function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/**
 * Optimizador heurístico nearest-neighbor (Fase 1).
 *
 * Ordena las paradas con coordenadas empezando por el origen (o la primera
 * parada), eligiendo siempre la más cercana. Las paradas sin coordenadas se
 * dejan al final en su orden original. Es una heurística simple y determinista,
 * suficiente para el MVP; un optimizador real se enchufa por el puerto.
 */
@Injectable()
export class NearestNeighborOptimizer implements RouteOptimizer {
  optimize(input: OptimizerInput): OptimizerResult {
    const withCoords = input.stops.filter(
      (s): s is OptimizerStop & { lat: number; lng: number } => s.lat !== null && s.lng !== null,
    );
    const withoutCoords = input.stops.filter((s) => s.lat === null || s.lng === null);

    const ordered: string[] = [];
    let estimatedKm = 0;
    const remaining = [...withCoords];

    let current = input.origin ?? (remaining.length > 0 ? remaining[0] : undefined);
    // Si no hay origen explícito, la primera parada abre la ruta sin sumar distancia.
    if (!input.origin && remaining.length > 0) {
      ordered.push(remaining[0].id);
      remaining.shift();
    }

    while (remaining.length > 0 && current) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < remaining.length; i++) {
        const d = haversineKm(current, remaining[i]);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
      const next = remaining.splice(bestIdx, 1)[0];
      estimatedKm += bestDist;
      ordered.push(next.id);
      current = next;
    }

    for (const s of withoutCoords) {
      ordered.push(s.id);
    }

    return { orderedStopIds: ordered, estimatedKm: Math.round(estimatedKm * 100) / 100 };
  }
}
