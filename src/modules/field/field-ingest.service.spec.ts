import { FieldIngestService, parseFecha } from './field-ingest.service';
import { StubCepheusConnector } from './cepheus/stub-cepheus.connector';

describe('parseFecha', () => {
  it('parsea dd/mm/aaaa HH:MM', () => {
    const d = parseFecha('08/09/2026 07:30')!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(8); // septiembre (0-index)
    expect(d.getDate()).toBe(8);
    expect(d.getHours()).toBe(7);
  });
  it('parsea dd/mm/aaaa sin hora', () => {
    expect(parseFecha('01/01/2026')!.getFullYear()).toBe(2026);
  });
  it('devuelve null para vacío o basura', () => {
    expect(parseFecha(null)).toBeNull();
    expect(parseFecha('no-fecha')).toBeNull();
  });
});

describe('FieldIngestService.ingest', () => {
  const tenantId = 't1';

  function build() {
    const store = new Map<string, { id: string; externalNum: string }>();
    const orderRepo = {
      findOne: jest.fn(({ where }: { where: { externalNum: string } }) =>
        Promise.resolve(store.get(where.externalNum) ?? null),
      ),
      save: jest.fn((o: { externalNum: string; id?: string }) => {
        const id = o.id ?? 'wo-' + o.externalNum;
        store.set(o.externalNum, { id, externalNum: o.externalNum });
        return Promise.resolve({ ...o, id });
      }),
    };
    const runRepo = { save: jest.fn((r) => Promise.resolve({ ...r, id: 'run1' })) };
    const dataSource = {
      transaction: jest.fn((cb: (m: unknown) => unknown) =>
        cb({ getRepository: () => orderRepo }),
      ),
    };
    const service = new FieldIngestService(
      orderRepo as never,
      runRepo as never,
      new StubCepheusConnector(),
      dataSource as never,
    );
    return { service, runRepo, orderRepo };
  }

  it('ingiere las 7 órdenes de ejemplo y mapea los campos', async () => {
    const { service, runRepo } = build();
    const res = await service.ingest(tenantId, new Date('2026-09-01'));
    expect(res.fetched).toBe(7);
    expect(res.created).toBe(7);
    expect(res.updated).toBe(0);
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', fetched: 7, created: 7 }),
    );
  });

  it('es idempotente: re-ingerir actualiza, no duplica', async () => {
    const { service } = build();
    await service.ingest(tenantId, new Date('2026-09-01'));
    const res2 = await service.ingest(tenantId, new Date('2026-09-01'));
    expect(res2.created).toBe(0);
    expect(res2.updated).toBe(7);
  });

  it('calcula ES_OFFLINE/ALERTA_TIEMPO en órdenes SOP abiertas con equipo caído', async () => {
    const { service, orderRepo } = build();
    await service.ingest(tenantId, new Date('2026-09-01'));
    const saved = orderRepo.save.mock.calls.map(([o]: [Record<string, unknown>]) => o);

    const abiertaConAlerta = saved.find((o) => o.externalNum === 'ORD-2001')!;
    expect(abiertaConAlerta.esOffline).toBe(true);
    expect(abiertaConAlerta.alertaTiempo).toBe(true); // abierta hace 3h

    const abiertaReciente = saved.find((o) => o.externalNum === 'ORD-2004')!;
    expect(abiertaReciente.esOffline).toBe(true);
    expect(abiertaReciente.alertaTiempo).toBe(false); // abierta hace 20min

    const instalacion = saved.find((o) => o.externalNum === 'ORD-1001')!;
    expect(instalacion.esOffline).toBe(false); // PEXTERNO no es soporte de fibra
  });

  it('clasifica la causa raíz de los soportes de fibra ya cerrados', async () => {
    const { service, orderRepo } = build();
    await service.ingest(tenantId, new Date('2026-09-01'));
    const saved = orderRepo.save.mock.calls.map(([o]: [Record<string, unknown>]) => o);

    const falsoPositivo = saved.find((o) => o.externalNum === 'ORD-2002')!;
    expect(falsoPositivo.esOffline).toBe(false); // ya cerrada
    expect(falsoPositivo.causaOffline).toBe('✅ Falso positivo (estaba en línea)');

    const equipoCliente = saved.find((o) => o.externalNum === 'ORD-2003')!;
    expect(equipoCliente.causaOffline).toBe('⚡ Equipo del cliente (ONU/ONT)');

    const abierta = saved.find((o) => o.externalNum === 'ORD-2001')!;
    expect(abierta.causaOffline).toBeNull(); // no está cerrada: aún no hay causa
  });
});
