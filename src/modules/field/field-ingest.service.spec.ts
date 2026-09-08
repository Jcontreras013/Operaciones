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
    return { service, runRepo };
  }

  it('ingiere las 3 órdenes de ejemplo y mapea los campos', async () => {
    const { service, runRepo } = build();
    const res = await service.ingest(tenantId, new Date('2026-09-01'));
    expect(res.fetched).toBe(3);
    expect(res.created).toBe(3);
    expect(res.updated).toBe(0);
    expect(runRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'ok', fetched: 3, created: 3 }),
    );
  });

  it('es idempotente: re-ingerir actualiza, no duplica', async () => {
    const { service } = build();
    await service.ingest(tenantId, new Date('2026-09-01'));
    const res2 = await service.ingest(tenantId, new Date('2026-09-01'));
    expect(res2.created).toBe(0);
    expect(res2.updated).toBe(3);
  });
});
