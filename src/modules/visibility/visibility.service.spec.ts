import { VisibilityService } from './visibility.service';
import { OperationStatus } from '@modules/operations/entities/operation.entity';

const tenantId = '11111111-1111-1111-1111-111111111111';

describe('VisibilityService.getExceptions', () => {
  it('reporta operaciones demoradas y entregas sin POD', async () => {
    const staleOp = {
      id: 'op-stale',
      reference: 'OP-STALE',
      clientId: 'c1',
      status: OperationStatus.IN_TRANSIT,
      updatedAt: new Date('2026-09-01T00:00:00Z'),
    };
    const deliveredNoPod = {
      id: 'op-nopod',
      reference: 'OP-NOPOD',
      clientId: 'c1',
      status: OperationStatus.DELIVERED,
      updatedAt: new Date(),
    };
    const deliveredWithPod = {
      id: 'op-pod',
      reference: 'OP-POD',
      clientId: 'c1',
      status: OperationStatus.DELIVERED,
      updatedAt: new Date(),
    };

    const operations = {
      find: jest
        .fn()
        .mockResolvedValueOnce([staleOp]) // consulta de demoradas
        .mockResolvedValueOnce([deliveredNoPod, deliveredWithPod]), // entregadas
    };
    const documents = { find: jest.fn().mockResolvedValue([{ operationId: 'op-pod' }]) };

    const service = new VisibilityService(
      operations as never,
      documents as never,
      {} as never,
      {} as never,
    );

    const result = await service.getExceptions(tenantId, 24);

    const types = result.map((e) => `${e.type}:${e.reference}`).sort();
    expect(types).toEqual(['missing_pod:OP-NOPOD', 'stale:OP-STALE']);
  });
});
