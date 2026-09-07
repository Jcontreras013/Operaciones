import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EventsService } from '@modules/events/events.service';
import { DomainEventType } from '@modules/events/event-types';
import { Client } from './client.entity';
import { CreateClientDto } from './dto/create-client.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    private readonly events: EventsService,
  ) {}

  async create(tenantId: string, dto: CreateClientDto): Promise<Client> {
    const client = await this.clients.save({
      tenantId,
      name: dto.name,
      code: dto.code ?? null,
      contactEmail: dto.contactEmail ?? null,
      contactName: dto.contactName ?? null,
      active: true,
    });

    await this.events.publish({
      tenantId,
      type: DomainEventType.CLIENT_CREATED,
      entity: 'Client',
      entityId: client.id,
      payload: { name: client.name },
      occurredAt: new Date(),
    });

    return client;
  }

  list(tenantId: string): Promise<Client[]> {
    return this.clients.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async get(tenantId: string, id: string): Promise<Client> {
    const client = await this.clients.findOne({ where: { tenantId, id } });
    if (!client) {
      throw new NotFoundException('Cliente no encontrado');
    }
    return client;
  }
}
