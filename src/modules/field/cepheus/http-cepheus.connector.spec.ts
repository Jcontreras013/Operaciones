import { buildCepheusUrl, evaluarRespuestaCepheus, formatFechaDDMMYYYY } from './http-cepheus.connector';

describe('formatFechaDDMMYYYY', () => {
  it('formatea con ceros a la izquierda', () => {
    expect(formatFechaDDMMYYYY(new Date(2026, 0, 5))).toBe('05/01/2026');
  });
});

describe('buildCepheusUrl', () => {
  it('arma la query con los parámetros esperados', () => {
    const url = buildCepheusUrl('https://cepheus.local/ws', 'monitor1', 'FTTH,C', '07:00', '05/01/2026');
    expect(url).toBe(
      'https://cepheus.local/ws?usuario=monitor1&medios=FTTH%2CC&fechaInicio=05%2F01%2F2026&horaInicio=07%3A00',
    );
  });
});

describe('evaluarRespuestaCepheus', () => {
  it('devuelve ok con las órdenes cuando codigo=200 y hay órdenes', () => {
    const r = evaluarRespuestaCepheus({ codigo: 200, ordenes: [{ NUM: 'ORD-1' }], mensaje: 'ok' });
    expect(r).toEqual({ kind: 'ok', ordenes: [{ NUM: 'ORD-1' }] });
  });

  it('devuelve rate_limited cuando codigo=102, sin importar las órdenes', () => {
    const r = evaluarRespuestaCepheus({ codigo: 102, mensaje: 'Límite alcanzado' });
    expect(r).toEqual({ kind: 'rate_limited', mensaje: 'Límite alcanzado' });
  });

  it('devuelve retry cuando codigo != 200', () => {
    const r = evaluarRespuestaCepheus({ codigo: 401, mensaje: 'No autorizado' });
    expect(r).toEqual({ kind: 'retry', mensaje: 'No autorizado' });
  });

  it('devuelve retry cuando codigo=200 pero sin órdenes (cuenta sin datos)', () => {
    const r = evaluarRespuestaCepheus({ codigo: 200, ordenes: [], mensaje: 'sin datos' });
    expect(r).toEqual({ kind: 'retry', mensaje: 'sin datos' });
  });

  it('usa un mensaje por defecto si Cepheus no manda mensaje', () => {
    const r = evaluarRespuestaCepheus({ codigo: 500 });
    expect(r).toEqual({ kind: 'retry', mensaje: 'sin mensaje' });
  });
});
