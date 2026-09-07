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
  const operations = { get: jest.fn() };
  const dataSource = {};

  const service = new BillingService(
    rateCards as never,
    rateRules as never,
    charges as never,
    invoices as never,
    invoiceLines as never,
    operations as never,
    dataSource as never,
  );
  return { service, rateCards, rateRules, charges, operations };
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
