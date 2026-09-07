import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Password } from '@common/password';
import { EventsService } from '@modules/events/events.service';
import { DomainEventType } from '@modules/events/event-types';
import { Client } from './client.entity';
import { ClientUser } from './client-user.entity';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateClientUserDto } from './dto/create-client-user.dto';

@Injectable()
export class ClientsService {
  constructor(
    @InjectRepository(Client) private readonly clients: Repository<Client>,
    @InjectRepository(ClientUser) private readonly clientUsers: Repository<ClientUser>,
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

  /** Alta de un usuario del cliente para el portal (US1.4). */
  async addClientUser(
    tenantId: string,
    clientId: string,
    dto: CreateClientUserDto,
  ): Promise<ClientUser> {
    await this.get(tenantId, clientId); // valida que el cliente exista en el tenant
    const dup = await this.clientUsers.findOne({ where: { tenantId, email: dto.email } });
    if (dup) {
      throw new ConflictException(`El email "${dto.email}" ya está registrado`);
    }
    const { password, ...rest } = dto;
    const passwordHash = await Password.hash(password);
    const user = await this.clientUsers.save({
      tenantId,
      clientId,
      ...rest,
      passwordHash,
      active: true,
    });
    delete (user as Partial<ClientUser>).passwordHash;
    return user;
  }

  listClientUsers(tenantId: string, clientId: string): Promise<ClientUser[]> {
    return this.clientUsers.find({
      where: { tenantId, clientId },
      order: { createdAt: 'ASC' },
    });
  }
}
