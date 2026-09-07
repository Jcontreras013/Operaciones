import { BadRequestException } from '@nestjs/common';
import { BillingService } from './billing.service';
import { ChargeType, RateUnit } from './billing.enums';

const tenantId = '11111111-1111-1111-1111-111111111111';
const clientId = '22222222-2222-2222-2222-222222222222';
const operationId = '33333333-3333-3333-3333-333333333333';

function build() {
  const rateCards = { findOne: jest.fn(), find: jest.fn(), update: jest.fn() };
  const rateRules = { find: jest.fn() };
  const charges = { save: jest.fn().mockImplementation((c) => Promise.resolve({ id: 'ch1', ...c })) };
  const invoices = {};
  const invoiceLines = {};
  const costs = { find: jest.fn() };
  const carrierInvoices = { find: jest.fn(), findOne: jest.fn() };
  const carrierInvoiceLines = { find: jest.fn() };
  const operations = { get: jest.fn() };
  const dataSource: { transaction?: jest.Mock } = {};

  const service = new BillingService(
    rateCards as never,
    rateRules as never,
    charges as never,
    invoices as never,
    invoiceLines as never,
    costs as never,
    carrierInvoices as never,
    carrierInvoiceLines as never,
    operations as never,
    dataSource as never,
  );
  return {
    service,
    rateCards,
    rateRules,
    charges,
    costs,
    carrierInvoices,
    carrierInvoiceLines,
    operations,
    dataSource,
  };
}

describe('BillingService.createCharge', () => {
  it('calcula amountMinor = rateMinor × quantity con la tarifa dada', async () => {
    const { service, charges } = build();

    await service.createCharge({
      tenantId,
      clientId,
      operationId,
      chargeType: ChargeType.STORAGE,
      description: 'Almacenaje',
      quantity: 5,
      rateMinor: 2000,
      currency: 'USD',
    });

    expect(charges.save).toHaveBeenCalledWith(
      expect.objectContaining({ rateMinor: '2000', quantity: 5, amountMinor: '10000' }),
    );
  });

  it('resuelve la tarifa desde la rate card activa cuando no se pasa rateMinor', async () => {
    const { service, rateCards, rateRules, charges } = build();
    rateCards.findOne.mockResolvedValue({ id: 'rc1', currency: 'USD' });
    rateRules.find.mockResolvedValue([
      { id: 'rule-hand', chargeType: ChargeType.HANDLING, rateMinor: '1500', unit: RateUnit.PER_MOVEMENT },
    ]);

    await service.createCharge({
      tenantId,
      clientId,
      operationId,
      chargeType: ChargeType.HANDLING,
      description: 'Handling',
      quantity: 2,
    });

    expect(charges.save).toHaveBeenCalledWith(
      expect.objectContaining({ rateMinor: '1500', amountMinor: '3000', rateRuleId: 'rule-hand' }),
    );
  });

  it('falla si no hay rate card activa y no se pasa tarifa', async () => {
    const { service, rateCards } = build();
    rateCards.findOne.mockResolvedValue(null);

    await expect(
      service.createCharge({
        tenantId,
        clientId,
        operationId,
        chargeType: ChargeType.VAS,
        description: 'Etiquetado',
        quantity: 1,
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('BillingService.getOperationFinancials', () => {
  it('calcula margen = ingresos − costos', async () => {
    const { service, charges, costs, operations } = build();
    operations.get.mockResolvedValue({ id: operationId });
    (charges as { find?: jest.Mock }).find = jest.fn().mockResolvedValue([
      { amountMinor: '50000' },
      { amountMinor: '1500' },
    ]);
    costs.find.mockResolvedValue([{ amountMinor: '30000' }]);

    const result = await service.getOperationFinancials(tenantId, operationId);

    expect(result).toEqual({ revenueMinor: '51500', costMinor: '30000', marginMinor: '21500' });
  });
});

describe('BillingService.reconcileCarrierInvoice', () => {
  it('marca DISPUTED y calcula la variación cuando el carrier cobra de más', async () => {
    const { service, carrierInvoices, carrierInvoiceLines, costs, dataSource } = build();
    const invoice = { id: 'ci1', supplier: 'Naviera', status: 'pending', reconciledAt: null };
    carrierInvoices.findOne.mockResolvedValue(invoice);
    const line = { operationId: 'op1', declaredMinor: '30000', recordedMinor: null, varianceMinor: null };
    carrierInvoiceLines.find.mockResolvedValue([line]);
    // Costo registrado para op1 + Naviera = 28000 → variación 2000.
    costs.find.mockResolvedValue([{ amountMinor: '28000' }]);
    dataSource.transaction = jest.fn().mockImplementation(async (cb: (m: unknown) => unknown) =>
      cb({ getRepository: () => ({ save: jest.fn() }) }),
    );

    const report = await service.reconcileCarrierInvoice(tenantId, 'ci1', 0);

    expect(line.recordedMinor).toBe('28000');
    expect(line.varianceMinor).toBe('2000');
    expect(report.discrepancies).toBe(1);
    expect(report.totalVarianceMinor).toBe('2000');
    expect(invoice.status).toBe('disputed');
  });

  it('marca RECONCILED cuando la variación cae dentro de la tolerancia', async () => {
    const { service, carrierInvoices, carrierInvoiceLines, costs, dataSource } = build();
    const invoice = { id: 'ci2', supplier: 'Naviera', status: 'pending', reconciledAt: null };
    carrierInvoices.findOne.mockResolvedValue(invoice);
    const line = { operationId: 'op1', declaredMinor: '30000', recordedMinor: null, varianceMinor: null };
    carrierInvoiceLines.find.mockResolvedValue([line]);
    costs.find.mockResolvedValue([{ amountMinor: '29900' }]); // variación 100
    dataSource.transaction = jest.fn().mockImplementation(async (cb: (m: unknown) => unknown) =>
      cb({ getRepository: () => ({ save: jest.fn() }) }),
    );

    const report = await service.reconcileCarrierInvoice(tenantId, 'ci2', 100); // tolerancia 100

    expect(report.discrepancies).toBe(0);
    expect(invoice.status).toBe('reconciled');
  });
});
