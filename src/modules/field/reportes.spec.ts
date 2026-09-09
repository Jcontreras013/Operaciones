import {
  categoriaRetraso,
  clasificarTablero,
  diasRetraso,
  esEstadoVivo,
  esInstalacion,
  esPendienteMonitor,
  esPlex,
  esSop,
  subtipoInstalacion,
  tieneTecnicoValido,
} from './reportes';

// Los mismos casos que test_clasificador.py en monitor-operativo, para que
// esos bugs de producción (PEXTERNO fugándose a INS/SOP) no puedan volver.
describe('esPlex / esSop / esInstalacion', () => {
  it('detecta PLEX solo por actividad', () => {
    expect(esPlex('PEXTERNO')).toBe(true);
    expect(esPlex('SPLITTEROPT')).toBe(true);
    expect(esPlex('PLEXISCA')).toBe(true);
    expect(esPlex('SOPFIBRA')).toBe(false);
    expect(esPlex('INSFIBRA')).toBe(false);
    expect(esPlex('')).toBe(false);
    expect(esPlex(null)).toBe(false);
  });

  it('distingue SOP de instalación', () => {
    expect(esSop('SOPFIBRACORP')).toBe(true);
    expect(esSop('SOP')).toBe(true);
    expect(esSop('INSFIBRA')).toBe(false);
    expect(esInstalacion('INSFIBRA')).toBe(true);
    expect(esInstalacion('orden NUEVA de cliente')).toBe(true);
    expect(esInstalacion('PEXTERNO')).toBe(false);
  });
});

describe('subtipoInstalacion', () => {
  it('clasifica el subtipo por palabras clave', () => {
    expect(subtipoInstalacion('INS ADIC')).toBe('Adición');
    expect(subtipoInstalacion('CAMBIO de plan')).toBe('Cambio / Migración');
    expect(subtipoInstalacion('MIGRACION')).toBe('Cambio / Migración');
    expect(subtipoInstalacion('RECUPERADO')).toBe('Recuperado');
    expect(subtipoInstalacion('INSFIBRA nueva')).toBe('Nueva');
  });
});

describe('clasificarTablero', () => {
  it('REGRESIÓN: un PEXTERNO no se fuga a INS/SOP aunque el comentario mencione instalación/falla', () => {
    const casos: [string, string][] = [
      ['PEXTERNO', 'instalacion de nueva acometida'],
      ['PEXTERNO', 'falla en poste'],
      ['PEXTERNO', 'revision de cambio de ruta'],
      ['SPLITTEROPT', 'nueva caja splitter'],
      ['SPLITTEROPT', 'mantenimiento preventivo'],
      ['PLEXISCA', 'cliente reporta falla'],
    ];
    for (const [act, com] of casos) {
      expect(clasificarTablero(act, com).grupo).toBe('OTROS');
    }
  });

  it('un soporte real sigue siendo SOP', () => {
    expect(clasificarTablero('SOPFIBRA', 'sin internet').grupo).toBe('SOP');
  });

  it('una instalación real sigue siendo INS', () => {
    expect(clasificarTablero('INSFIBRA', 'instalacion nueva').grupo).toBe('INS');
  });

  it('un SOP cuyo comentario dice "instalada" no se va a INS (la actividad manda)', () => {
    expect(clasificarTablero('SOPFIBRA', 'antena recien instalada').grupo).toBe('SOP');
  });

  it('offline tiene prioridad en el subtipo SOP', () => {
    const r = clasificarTablero('SOPFIBRA', 'ONU OFFLINE', true);
    expect(r).toEqual({ grupo: 'SOP', subtipo: 'ONT/ONU Offline' });
  });
});

describe('esEstadoVivo / esPendienteMonitor', () => {
  it('reconoce estados en curso', () => {
    expect(esEstadoVivo('ASIGNADA')).toBe(true);
    expect(esEstadoVivo('EN RUTA')).toBe(true);
    expect(esEstadoVivo('CERRADA')).toBe(false);
    expect(esEstadoVivo('ANULADA')).toBe(false);
  });

  it('una orden viva con técnico es pendiente, sin importar la actividad', () => {
    expect(esPendienteMonitor({ estado: 'ASIGNADA', tecnico: 'Norman', actividad: 'CUALQUIER_COSA' })).toBe(true);
  });

  it('una orden viva sin técnico solo es pendiente si la actividad está permitida', () => {
    expect(esPendienteMonitor({ estado: 'ASIGNADA', tecnico: '', actividad: 'SOPFIBRA' })).toBe(true);
    expect(esPendienteMonitor({ estado: 'ASIGNADA', tecnico: '', actividad: 'ALGO_NO_LISTADO' })).toBe(false);
  });

  it('una orden cerrada nunca es pendiente', () => {
    expect(esPendienteMonitor({ estado: 'CERRADA', tecnico: 'Norman', actividad: 'SOPFIBRA' })).toBe(false);
  });
});

describe('tieneTecnicoValido', () => {
  it('rechaza técnico vacío o marcadores de nulo', () => {
    expect(tieneTecnicoValido('Norman Guardado')).toBe(true);
    expect(tieneTecnicoValido('')).toBe(false);
    expect(tieneTecnicoValido('N/D')).toBe(false);
    expect(tieneTecnicoValido(null)).toBe(false);
  });
});

describe('diasRetraso / categoriaRetraso', () => {
  const ahora = new Date('2026-09-09T12:00:00Z');

  it('calcula días completos desde fechaApe, sin importar la hora', () => {
    expect(diasRetraso(new Date('2026-09-09T23:00:00Z'), 'Norman', ahora)).toBe(0);
    expect(diasRetraso(new Date('2026-09-06T01:00:00Z'), 'Norman', ahora)).toBe(3);
    expect(diasRetraso(new Date('2026-09-01T01:00:00Z'), 'Norman', ahora)).toBe(8);
  });

  it('nunca es negativo (fecha futura)', () => {
    expect(diasRetraso(new Date('2026-09-15T00:00:00Z'), 'Norman', ahora)).toBe(0);
  });

  it('el técnico excluido siempre tiene 0 días de retraso', () => {
    expect(diasRetraso(new Date('2026-08-01T00:00:00Z'), 'Josue Miguel Sauceda', ahora)).toBe(0);
  });

  it('sin fechaApe, 0 días', () => {
    expect(diasRetraso(null, 'Norman', ahora)).toBe(0);
  });

  it('categoriza en los 4 buckets del original', () => {
    expect(categoriaRetraso(0)).toBe('= 0 Dia');
    expect(categoriaRetraso(2)).toBe('= 1 a 3 Dias');
    expect(categoriaRetraso(5)).toBe('= 4 a 6 Dias');
    expect(categoriaRetraso(9)).toBe('>= 7 Dia');
  });
});
