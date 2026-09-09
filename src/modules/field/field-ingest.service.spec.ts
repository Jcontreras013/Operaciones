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

  it('estado/actividad/motivo se pasan como In(...) para multiselección', async () => {
    const orderRepo = { find: jest.fn().mockResolvedValue([]) };
    const service = new FieldIngestService(orderRepo as never, {} as never, {} as never, {} as never);
    await service.listWorkOrders('t1', { estado: ['ASIGNADA', 'CERRADA'], actividad: ['SOPFIBRA'], motivo: ['NIVELES'] });
    const [opts] = orderRepo.find.mock.calls[0];
    expect(opts.where.estado._value).toEqual(['ASIGNADA', 'CERRADA']);
    expect(opts.where.actividad._value).toEqual(['SOPFIBRA']);
    expect(opts.where.motivo._value).toEqual(['NIVELES']);
  });

  it('"criticas"/"noAsignadas" filtran en memoria sin límite de página', async () => {
    const orderRepo = {
      find: jest.fn().mockResolvedValue([
        { actividad: 'SOPFIBRA', tecnico: 'Norman', esOffline: true, alertaTiempo: false },
        { actividad: 'INSFIBRA', tecnico: 'Norman', esOffline: true, alertaTiempo: false },
        { actividad: 'SOPFIBRA', tecnico: '', esOffline: false, alertaTiempo: false },
      ]),
    };
    const service = new FieldIngestService(orderRepo as never, {} as never, {} as never, {} as never);

    const criticas = await service.listWorkOrders('t1', { criticas: true });
    expect(criticas).toHaveLength(1);
    expect(criticas[0].actividad).toBe('SOPFIBRA');
    expect(orderRepo.find.mock.calls[0][0].take).toBeUndefined();

    const noAsignadas = await service.listWorkOrders('t1', { noAsignadas: true });
    expect(noAsignadas).toHaveLength(1);
    expect(noAsignadas[0].tecnico).toBe('');
  });
});

describe('FieldIngestService.getReportesBoard', () => {
  const tenantId = 't1';
  const ahora = new Date('2026-09-09T12:00:00Z'); // mediodía UTC = 06:00 en Honduras

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(ahora);
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  function buildWithOrders(orders: Partial<Record<string, unknown>>[]) {
    const orderRepo = { find: jest.fn().mockResolvedValue(orders) };
    const service = new FieldIngestService(orderRepo as never, {} as never, {} as never, {} as never);
    return { service, orderRepo };
  }

  it('cuenta KPIs: pendientes asignadas, cerradas hoy, técnicos en ruta y caídas offline', async () => {
    const { service } = buildWithOrders([
      // pendiente asignada, en mora (3 días), sin offline
      { estado: 'ASIGNADA', tecnico: 'Norman', actividad: 'SOPFIBRA', segmento: 'RESIDENCIAL', fechaApe: new Date('2026-09-06T12:00:00Z'), esOffline: false },
      // pendiente asignada, del mismo técnico, offline
      { estado: 'EN RUTA', tecnico: 'Norman', actividad: 'INSFIBRA', segmento: 'RESIDENCIAL', fechaApe: ahora, esOffline: true },
      // cerrada hoy (Honduras), en mora al abrir, cuenta permitida
      { estado: 'CERRADA', tecnico: 'Harin', actividad: 'SOPFIBRA', segmento: 'RESIDENCIAL', fechaApe: new Date('2026-09-04T12:00:00Z'), horaLiqAt: ahora },
      // cerrada hoy, abierta hoy también, otro segmento
      { estado: 'CERRADA', tecnico: 'Andres', actividad: 'INSFIBRA', segmento: 'PLEX', fechaApe: ahora, horaLiqAt: ahora },
      // pendiente sin técnico pero actividad permitida: cuenta en total, no en asignadas
      { estado: 'PENDIENTE', tecnico: '', actividad: 'SOPFIBRA', segmento: 'RESIDENCIAL', fechaApe: null },
      // cerrada, pero actividad no permitida: no cuenta como cerradaHoy
      { estado: 'CERRADA', tecnico: 'Miguel', actividad: 'NOPERMITIDA', segmento: 'RESIDENCIAL', horaLiqAt: ahora },
    ]);

    const board = await service.getReportesBoard(tenantId);

    expect(board.kpis).toEqual({
      pendientesAsignadas: 2,
      cerradasHoy: 2,
      tecnicosEnRuta: 1,
      caidasOffline: 1,
      totalGeneral: 3,
    });
  });

  it('tablero de carga: agrupa por retraso y por SOP/Instalaciones/Plex', async () => {
    const { service } = buildWithOrders([
      { estado: 'ASIGNADA', tecnico: 'Norman', actividad: 'SOPFIBRA', fechaApe: new Date('2026-09-06T12:00:00Z') }, // 3 días
      { estado: 'EN RUTA', tecnico: 'Norman', actividad: 'INSFIBRA', fechaApe: ahora }, // 0 días
      { estado: 'PENDIENTE', tecnico: '', actividad: 'SOPFIBRA', fechaApe: null }, // 0 días, sin técnico
      { estado: 'ASIGNADA', tecnico: 'Harin', actividad: 'PEXTERNO', fechaApe: ahora },
    ]);

    const board = await service.getReportesBoard(tenantId);

    expect(board.tablero.resumenRetraso).toEqual([
      { categoria: '>= 7 Dia', cantidad: 0 },
      { categoria: '= 4 a 6 Dias', cantidad: 0 },
      { categoria: '= 1 a 3 Dias', cantidad: 1 },
      { categoria: '= 0 Dia', cantidad: 3 },
    ]);
    expect(board.tablero.sop).toEqual([{ etiqueta: 'FTTH / FIBRA', cantidad: 2 }]);
    expect(board.tablero.instalaciones).toEqual([
      { etiqueta: 'Nueva', cantidad: 1 },
      { etiqueta: 'Adición', cantidad: 0 },
      { etiqueta: 'Cambio / Migración', cantidad: 0 },
      { etiqueta: 'Recuperado', cantidad: 0 },
    ]);
    expect(board.tablero.plex).toEqual([{ etiqueta: 'PEXTERNO', cantidad: 1 }]);
    expect(board.tablero.excedenDosHoras).toBe(0);
  });

  it('consolidado por segmento: separa mora de hoy y calcula porcentajes de cierre', async () => {
    const { service } = buildWithOrders([
      // pendiente asignada RESIDENCIAL en mora (3 días)
      { estado: 'ASIGNADA', tecnico: 'Norman', actividad: 'SOPFIBRA', segmento: 'RESIDENCIAL', fechaApe: new Date('2026-09-06T12:00:00Z') },
      // pendiente asignada RESIDENCIAL de hoy
      { estado: 'EN RUTA', tecnico: 'Norman', actividad: 'INSFIBRA', segmento: 'RESIDENCIAL', fechaApe: ahora },
      // cerrada hoy, RESIDENCIAL, abierta en mora
      { estado: 'CERRADA', tecnico: 'Harin', actividad: 'SOPFIBRA', segmento: 'RESIDENCIAL', fechaApe: new Date('2026-09-04T12:00:00Z'), horaLiqAt: ahora },
    ]);

    const board = await service.getReportesBoard(tenantId);

    expect(board.segmentos.residencial).toEqual({
      totalGlobal: 3,
      cerradasGlobal: 1,
      pctGlobal: (1 / 3) * 100,
      totalMora: 2,
      cerradasMora: 1,
      pctMora: (1 / 2) * 100,
      totalHoy: 1,
      cerradasHoy: 0,
      pctHoy: 0,
    });
  });
});
