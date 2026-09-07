import { NearestNeighborOptimizer } from './nearest-neighbor.optimizer';

describe('NearestNeighborOptimizer', () => {
  const opt = new NearestNeighborOptimizer();

  it('ordena las paradas por cercanía desde el origen', () => {
    // Origen en (0,0). Paradas a ~1, ~2 y ~3 grados de latitud.
    const result = opt.optimize({
      origin: { lat: 0, lng: 0 },
      stops: [
        { id: 'lejos', lat: 3, lng: 0 },
        { id: 'cerca', lat: 1, lng: 0 },
        { id: 'medio', lat: 2, lng: 0 },
      ],
    });
    expect(result.orderedStopIds).toEqual(['cerca', 'medio', 'lejos']);
    expect(result.estimatedKm).toBeGreaterThan(0);
  });

  it('deja al final, en orden, las paradas sin coordenadas', () => {
    const result = opt.optimize({
      origin: { lat: 0, lng: 0 },
      stops: [
        { id: 'sin-a', lat: null, lng: null },
        { id: 'con', lat: 1, lng: 0 },
        { id: 'sin-b', lat: null, lng: null },
      ],
    });
    expect(result.orderedStopIds).toEqual(['con', 'sin-a', 'sin-b']);
  });

  it('sin origen, abre con la primera parada y no falla', () => {
    const result = opt.optimize({
      stops: [
        { id: 'a', lat: 10, lng: 10 },
        { id: 'b', lat: 10.1, lng: 10.1 },
      ],
    });
    expect(result.orderedStopIds).toEqual(['a', 'b']);
  });
});
