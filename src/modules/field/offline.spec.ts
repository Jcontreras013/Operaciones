import {
  clasificarCausaOffline,
  computeOfflineFlags,
  esOfflinePreciso,
  esUniversoDiagnostico,
} from './offline';

describe('esOfflinePreciso', () => {
  it('detecta un equipo caído', () => {
    expect(esOfflinePreciso('ONU OFFLINE, sin señal')).toBe(true);
  });
  it('no marca offline si el comentario ya indica solución', () => {
    expect(esOfflinePreciso('Estaba OFFLINE pero ya quedó recuperado')).toBe(false);
  });
  it('devuelve false para comentario vacío', () => {
    expect(esOfflinePreciso(null)).toBe(false);
    expect(esOfflinePreciso('')).toBe(false);
  });
});

describe('computeOfflineFlags', () => {
  const base = {
    actividad: 'SOPFIBRA',
    estado: 'ASIGNADA',
    tecnico: 'Norman Guardado',
    comentario: 'Cliente reporta OFFLINE',
    horaIniAt: null as Date | null,
    horaLiqAt: null as Date | null,
  };

  it('marca offline un soporte abierto con comentario de falla', () => {
    expect(computeOfflineFlags(base).esOffline).toBe(true);
  });

  it('no marca offline una instalación aunque el comentario mencione offline', () => {
    const r = computeOfflineFlags({ ...base, actividad: 'PEXTERNO' });
    expect(r.esOffline).toBe(false);
  });

  it('no marca offline una orden ya cerrada', () => {
    const r = computeOfflineFlags({ ...base, estado: 'CERRADA' });
    expect(r.esOffline).toBe(false);
  });

  it('excluye al técnico de la regla histórica', () => {
    const r = computeOfflineFlags({ ...base, tecnico: 'Josue Miguel Sauceda' });
    expect(r.esOffline).toBe(false);
  });

  it('activa ALERTA_TIEMPO cuando lleva más de 2h abierta sin liquidar', () => {
    const now = new Date('2026-09-09T15:00:00Z');
    const horaIniAt = new Date('2026-09-09T12:00:00Z'); // hace 3h
    const r = computeOfflineFlags({ ...base, horaIniAt, horaLiqAt: null }, now);
    expect(r.alertaTiempo).toBe(true);
  });

  it('no activa ALERTA_TIEMPO si lleva menos de 2h', () => {
    const now = new Date('2026-09-09T15:00:00Z');
    const horaIniAt = new Date('2026-09-09T14:30:00Z'); // hace 30min
    const r = computeOfflineFlags({ ...base, horaIniAt, horaLiqAt: null }, now);
    expect(r.alertaTiempo).toBe(false);
  });
});

describe('esUniversoDiagnostico', () => {
  it('exige soporte de fibra, cerrada y con técnico asignado', () => {
    expect(
      esUniversoDiagnostico({ actividad: 'SOPFIBRA', estado: 'CERRADA', tecnico: 'Norman Guardado' }),
    ).toBe(true);
    expect(
      esUniversoDiagnostico({ actividad: 'SOPFIBRA', estado: 'ASIGNADA', tecnico: 'Norman Guardado' }),
    ).toBe(false); // aún abierta
    expect(esUniversoDiagnostico({ actividad: 'SOPFIBRA', estado: 'CERRADA', tecnico: '' })).toBe(false);
    expect(
      esUniversoDiagnostico({ actividad: 'PEXTERNO', estado: 'CERRADA', tecnico: 'Norman Guardado' }),
    ).toBe(false); // instalación, no soporte
  });
});

describe('clasificarCausaOffline', () => {
  it('detecta un falso positivo', () => {
    const r = clasificarCausaOffline('ESTABA ONLINE', 'Cliente ya navegando', '');
    expect(r.causa).toBe('✅ Falso positivo (estaba en línea)');
  });

  it('prioriza instalación deficiente sobre nivel óptico (mal empalme)', () => {
    const r = clasificarCausaOffline('', 'Se corrigió mal empalme en la caja', '');
    expect(r.causa).toBe('🔁 Instalación deficiente / retrabajo');
  });

  it('devuelve "sin comentario de cierre" si no hay texto', () => {
    expect(clasificarCausaOffline(null, null, null).causa).toBe('❓ Sin comentario de cierre');
  });

  it('devuelve "sin clasificar" si no coincide ninguna causa conocida', () => {
    expect(clasificarCausaOffline('motivo raro sin match', '', '').causa).toBe('❓ Sin clasificar');
  });
});
