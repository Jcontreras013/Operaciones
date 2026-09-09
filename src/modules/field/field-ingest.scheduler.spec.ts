import { FieldIngestScheduler } from './field-ingest.scheduler';

function build(tenantsActivos: { id: string; slug: string }[]) {
  const ingest = { ingest: jest.fn().mockResolvedValue({ fetched: 1, created: 1, updated: 0, runId: 'r1' }) };
  const tenants = { find: jest.fn().mockResolvedValue(tenantsActivos) };
  const scheduler = { addCronJob: jest.fn() };
  const svc = new FieldIngestScheduler(ingest as never, tenants as never, scheduler as never);
  return { svc, ingest, tenants, scheduler };
}

describe('FieldIngestScheduler', () => {
  afterEach(() => {
    delete process.env.CEPHEUS_SYNC_CRON;
    delete process.env.CEPHEUS_SYNC_VENTANA_HORAS;
  });

  it('onModuleInit registra y arranca un cron job con el nombre esperado', () => {
    const { svc, scheduler } = build([]);
    svc.onModuleInit();
    expect(scheduler.addCronJob).toHaveBeenCalledTimes(1);
    const [name, job] = scheduler.addCronJob.mock.calls[0];
    expect(name).toBe(FieldIngestScheduler.JOB_NAME);
    expect(job.running).toBe(true);
    job.stop(); // no dejar el timer real vivo tras el test
  });

  it('usa CEPHEUS_SYNC_CRON si está definida', () => {
    process.env.CEPHEUS_SYNC_CRON = '*/15 * * * *';
    const { svc, scheduler } = build([]);
    svc.onModuleInit();
    const [, job] = scheduler.addCronJob.mock.calls[0];
    expect(job.cronTime.source).toBe('*/15 * * * *');
    job.stop();
  });

  it('ingiere cada tenant activo con la ventana configurada', async () => {
    const { svc, ingest, tenants } = build([
      { id: 't1', slug: 'maxcom' },
      { id: 't2', slug: 'andina' },
    ]);
    process.env.CEPHEUS_SYNC_VENTANA_HORAS = '5';

    await (svc as unknown as { ingestarTodosLosTenants(): Promise<void> }).ingestarTodosLosTenants();

    expect(tenants.find).toHaveBeenCalledWith({ where: { active: true } });
    expect(ingest.ingest).toHaveBeenCalledTimes(2);
    const [tenantId1, from1] = ingest.ingest.mock.calls[0];
    expect(tenantId1).toBe('t1');
    expect(Date.now() - from1.getTime()).toBeGreaterThanOrEqual(5 * 60 * 60 * 1000 - 1000);
  });

  it('si un tenant falla, sigue con los demás (no revienta la corrida completa)', async () => {
    const { svc, ingest } = build([
      { id: 't1', slug: 'maxcom' },
      { id: 't2', slug: 'andina' },
    ]);
    ingest.ingest.mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce({
      fetched: 1,
      created: 1,
      updated: 0,
      runId: 'r2',
    });

    await expect(
      (svc as unknown as { ingestarTodosLosTenants(): Promise<void> }).ingestarTodosLosTenants(),
    ).resolves.toBeUndefined();
    expect(ingest.ingest).toHaveBeenCalledTimes(2);
  });
});
