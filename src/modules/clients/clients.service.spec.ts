import { NotFoundException } from '@nestjs/common';
import { EventsService } from '@modules/events/events.service';
import { DomainEventType } from '@modules/events/event-types';
import { ClientsService } from './clients.service';
import { Client } from './client.entity';

describe('ClientsService', () => {
  const tenantId = '11111111-1111-1111-1111-111111111111';

  function build() {
    const saved: Client = { id: 'c1', tenantId, name: 'Acme' } as Client;
    const repo = {
      save: jest.fn().mockResolvedValue(saved),
      find: jest.fn().mockResolvedValue([saved]),
      findOne: jest.fn(),
    };
    const events = { publish: jest.fn().mockResolvedValue(undefined) };
    const service = new ClientsService(repo as never, events as unknown as EventsService);
    return { service, repo, events, saved };
  }

  it('crea el cliente con el tenantId del contexto y publica CLIENT_CREATED', async () => {
    const { service, repo, events } = build();

    await service.create(tenantId, { name: 'Acme' });

    expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ tenantId, name: 'Acme' }));
    expect(events.publish).toHaveBeenCalledWith(
      expect.objectContaining({ tenantId, type: DomainEventType.CLIENT_CREATED }),
    );
  });

  it('get() lanza NotFound cuando el cliente no existe en el tenant', async () => {
    const { service, repo } = build();
    repo.findOne.mockResolvedValue(null);

    await expect(service.get(tenantId, 'missing')).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.findOne).toHaveBeenCalledWith({ where: { tenantId, id: 'missing' } });
  });
});
