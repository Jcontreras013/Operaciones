import { BadRequestException } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { MovementType } from './warehouse.enums';

const tenantId = 't1';
const warehouseId = 'w1';
const locationId = 'l1';
const clientId = 'c1';

function build() {
  const stock = { createQueryBuilder: jest.fn() };
  const movements = {};
  const warehouses = { getLocation: jest.fn().mockResolvedValue({ id: locationId }) };
  const clients = { get: jest.fn().mockResolvedValue({ id: clientId }) };
  const events = { record: jest.fn().mockResolvedValue(undefined), dispatch: jest.fn() };

  // Mock del EntityManager y de sus repos usados dentro de la transacción.
  const stockRepo = { findOne: jest.fn(), save: jest.fn() };
  const movementRepo = { save: jest.fn().mockImplementation((m) => Promise.resolve({ id: 'mv1', ...m })) };
  const manager = {
    getRepository: jest.fn((entity: { name: string }) =>
      entity.name === 'StockMovement' ? movementRepo : stockRepo,
    ),
  };
  const dataSource = {
    transaction: jest.fn().mockImplementation((cb: (m: unknown) => unknown) => cb(manager)),
  };

  const service = new InventoryService(
    stock as never,
    movements as never,
    warehouses as never,
    clients as never,
    events as never,
    dataSource as never,
  );
  return { service, stockRepo, movementRepo, events };
}

describe('InventoryService', () => {
  it('recibe mercancía: crea/incrementa stock, registra movimiento y despacha evento', async () => {
    const { service, stockRepo, movementRepo, events } = build();
    stockRepo.findOne.mockResolvedValue(null); // no existía stock

    const mv = await service.receipt(tenantId, warehouseId, {
      clientId,
      locationId,
      sku: 'SKU-1',
      quantity: 10,
    });

    expect(stockRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'SKU-1', quantity: 10, clientId }),
    );
    expect(movementRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ type: MovementType.RECEIPT, quantity: 10 }),
    );
    expect(mv.id).toBe('mv1');
    expect(events.record).toHaveBeenCalled();
    expect(events.dispatch).toHaveBeenCalled();
  });

  it('pick con existencia insuficiente falla y no registra movimiento', async () => {
    const { service, stockRepo, movementRepo } = build();
    stockRepo.findOne.mockResolvedValue({ quantity: 3 }); // solo hay 3

    await expect(
      service.pick(tenantId, warehouseId, { clientId, locationId, sku: 'SKU-1', quantity: 5 }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(movementRepo.save).not.toHaveBeenCalled();
  });
});
