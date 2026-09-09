import { FieldIngestService, parseFecha } from './field-ingest.service';
import { StubCepheusConnector } from './cepheus/stub-cepheus.connector';

describe('parseFecha', () => {
  it('parsea dd/mm/aaaa HH:MM como hora de Honduras (UTC-6), no la del proceso', () => {
    // 07:30 en Honduras = 13:30 UTC, sin importar en qué zona corra el server.
    const d = parseFecha('08/09/2026 07:30')!;
    expect(d.toISOString()).toBe('2026-09-08T13:30:00.000Z');
  });
  it('parsea dd/mm/aaaa sin hora (medianoche de Honduras = 06:00 UTC)', () => {
    expect(parseFecha('01/01/2026')!.toISOString()).toBe('2026-01-01T06:00:00.000Z');
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

describe('FieldIngestService.getGantt', () => {
  const tenantId = 't1';

  function buildWithOrders(orders: Partial<Record<string, unknown>>[]) {
    const orderRepo = { find: jest.fn().mockResolvedValue(orders) };
    const service = new FieldIngestService(orderRepo as never, {} as never, {} as never, {} as never);
    return { service, orderRepo };
  }

  it('rechaza una fecha con formato inválido', async () => {
    const { service } = buildWithOrders([]);
    await expect(service.getGantt(tenantId, '09/09/2026')).rejects.toThrow('Fecha inválida');
  });

  it('consulta horaIniAt dentro del día calendario de Honduras (UTC-6)', async () => {
    const { service, orderRepo } = buildWithOrders([]);
    await service.getGantt(tenantId, '2026-09-09');
    const [{ where }] = orderRepo.find.mock.calls[0];
    // Medianoche de Honduras del 9 de sept. es las 06:00 UTC del mismo día.
    expect(where.horaIniAt._value[0].toISOString()).toBe('2026-09-09T06:00:00.000Z');
    expect(where.horaIniAt._value[1].toISOString()).toBe('2026-09-10T06:00:00.000Z');
  });

  it('descarta órdenes sin técnico o sin horaIniAt', async () => {
    const { service } = buildWithOrders([
      { tecnico: null, horaIniAt: new Date('2026-09-09T12:00:00Z') },
      { tecnico: 'Norman', horaIniAt: null },
    ]);
    const rows = await service.getGantt(tenantId, '2026-09-09');
    expect(rows).toHaveLength(0);
  });

  it('usa horaLiqAt como fin cuando existe', async () => {
    const { service } = buildWithOrders([
      {
        tecnico: 'Norman',
        externalNum: 'ORD-1',
        cliente: 'Juan',
        actividad: 'SOPFIBRA',
        estado: 'CERRADA',
        horaIniAt: new Date('2026-09-09T12:00:00Z'),
        horaLiqAt: new Date('2026-09-09T13:30:00Z'),
      },
    ]);
    const [row] = await service.getGantt(tenantId, '2026-09-09');
    expect(row.inicio).toBe('2026-09-09T12:00:00.000Z');
    expect(row.fin).toBe('2026-09-09T13:30:00.000Z');
  });

  it('aplica un ancho mínimo de 15 minutos a visitas muy cortas', async () => {
    const { service } = buildWithOrders([
      {
        tecnico: 'Norman',
        externalNum: 'ORD-1',
        horaIniAt: new Date('2026-09-09T12:00:00Z'),
        horaLiqAt: new Date('2026-09-09T12:02:00Z'),
      },
    ]);
    const [row] = await service.getGantt(tenantId, '2026-09-09');
    expect(new Date(row.fin).getTime() - new Date(row.inicio).getTime()).toBe(15 * 60 * 1000);
  });

  it('sin horaLiqAt en un día pasado, cierra la franja al final de ese día', async () => {
    const { service } = buildWithOrders([
      {
        tecnico: 'Norman',
        externalNum: 'ORD-1',
        horaIniAt: new Date('2020-01-01T20:00:00Z'),
        horaLiqAt: null,
      },
    ]);
    const [row] = await service.getGantt(tenantId, '2020-01-01');
    expect(row.fin).toBe('2020-01-02T06:00:00.000Z'); // medianoche de Honduras
  });
});

describe('FieldIngestService.listWorkOrders (filtro de fecha)', () => {
  it('sin from/to, limita a las 200 más recientes', async () => {
    const orderRepo = { find: jest.fn().mockResolvedValue([]) };
    const service = new FieldIngestService(orderRepo as never, {} as never, {} as never, {} as never);
    await service.listWorkOrders('t1', {});
    const [opts] = orderRepo.find.mock.calls[0];
    expect(opts.take).toBe(200);
    expect(opts.where.fechaApe).toBeUndefined();
  });

  it('con from/to, sube el límite a 500 y filtra por fechaApe', async () => {
    const orderRepo = { find: jest.fn().mockResolvedValue([]) };
    const service = new FieldIngestService(orderRepo as never, {} as never, {} as never, {} as never);
    await service.listWorkOrders('t1', { from: '2026-09-01', to: '2026-09-05' });
    const [opts] = orderRepo.find.mock.calls[0];
    expect(opts.take).toBe(500);
    expect(opts.where.fechaApe).toBeDefined();
  });
});
