import { NotFoundException } from '@nestjs/common';
import { PortalService } from './portal.service';
import { OperationStatus } from '@modules/operations/entities/operation.entity';

const tenantId = 't1';
const clientId = 'cA';

function build() {
  const operations = { find: jest.fn(), findOne: jest.fn() };
  const milestones = { find: jest.fn() };
  const documents = { find: jest.fn() };
  const invoices = { find: jest.fn(), findOne: jest.fn() };
  const invoiceLines = { find: jest.fn() };
  const service = new PortalService(
    operations as never,
    milestones as never,
    documents as never,
    invoices as never,
    invoiceLines as never,
  );
  return { service, operations };
}

describe('PortalService', () => {
  it('siempre filtra las operaciones por tenantId Y clientId', async () => {
    const { service, operations } = build();
    operations.find.mockResolvedValue([]);

    await service.listOperations(tenantId, clientId, { status: OperationStatus.IN_TRANSIT });

    const arg = operations.find.mock.calls[0][0];
    expect(arg.where).toMatchObject({ tenantId, clientId, status: OperationStatus.IN_TRANSIT });
  });

  it('getOperation lanza NotFound cuando la operación no es del cliente', async () => {
    const { service, operations } = build();
    operations.findOne.mockResolvedValue(null); // pertenece a otro cliente → no encontrada

    await expect(service.getOperation(tenantId, clientId, 'op-de-otro')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(operations.findOne).toHaveBeenCalledWith({
      where: { tenantId, clientId, id: 'op-de-otro' },
    });
  });
});
