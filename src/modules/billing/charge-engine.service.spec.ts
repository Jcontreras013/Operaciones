import { ChargeEngine } from './charge-engine.service';
import { DomainEventType } from '@modules/events/event-types';
import { ChargeType } from './billing.enums';

/**
 * Verifica el enganche de facturación por actividad: un evento de almacén /
 * última milla genera el cargo correcto según la regla de la rate card.
 */
describe('ChargeEngine (facturación por actividad)', () => {
  const tenantId = 't1';
  const clientId = 'c1';

  function build(rules: { chargeType: ChargeType; triggerStatus: string | null; id: string; rateMinor: string; description: string }[]) {
    const handlers: Record<string, (e: unknown) => Promise<void>> = {};
    const events = {
      on: jest.fn((type: string, h: (e: unknown) => Promise<void>) => {
        handlers[type] = h;
      }),
    };
    const billing = {
      getActiveRateCard: jest.fn().mockResolvedValue({ id: 'rc1', currency: 'USD' }),
      getRules: jest.fn().mockResolvedValue(rules),
      createCharge: jest.fn().mockResolvedValue({ id: 'ch1' }),
    };
    const operations = {};
    const engine = new ChargeEngine(events as never, billing as never, operations as never);
    engine.onModuleInit();
    return { handlers, billing };
  }

  it('warehouse.receipt genera un cargo HANDLING con la cantidad del evento', async () => {
    const { handlers, billing } = build([
      { id: 'r-hand', chargeType: ChargeType.HANDLING, triggerStatus: null, rateMinor: '1500', description: 'Recepción' },
    ]);

    await handlers[DomainEventType.WAREHOUSE_RECEIPT]({
      tenantId,
      type: DomainEventType.WAREHOUSE_RECEIPT,
      payload: { clientId, sku: 'SKU-1', quantity: 20 },
    });

    expect(billing.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({
        chargeType: ChargeType.HANDLING,
        quantity: 20,
        rateMinor: '1500',
        source: DomainEventType.WAREHOUSE_RECEIPT,
      }),
    );
  });

  it('delivery.delivered genera un cargo LAST_MILE (cantidad 1) con operationId del payload', async () => {
    const { handlers, billing } = build([
      { id: 'r-lm', chargeType: ChargeType.LAST_MILE, triggerStatus: null, rateMinor: '4000', description: 'Última milla' },
    ]);

    await handlers[DomainEventType.DELIVERY_DELIVERED]({
      tenantId,
      type: DomainEventType.DELIVERY_DELIVERED,
      payload: { clientId, operationId: 'op-9' },
    });

    expect(billing.createCharge).toHaveBeenCalledWith(
      expect.objectContaining({ chargeType: ChargeType.LAST_MILE, quantity: 1, operationId: 'op-9' }),
    );
  });

  it('sin regla del tipo, no crea cargo', async () => {
    const { handlers, billing } = build([
      { id: 'r-ps', chargeType: ChargeType.PER_SERVICE, triggerStatus: null, rateMinor: '50000', description: 'Gestión' },
    ]);

    await handlers[DomainEventType.WAREHOUSE_PICK]({
      tenantId,
      type: DomainEventType.WAREHOUSE_PICK,
      payload: { clientId, sku: 'SKU-1', quantity: 5 },
    });

    expect(billing.createCharge).not.toHaveBeenCalled();
  });
});
