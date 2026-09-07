import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { EventsService } from '@modules/events/events.service';
import { DomainEvent, DomainEventType } from '@modules/events/event-types';
import { ClientsService } from '@modules/clients/clients.service';
import { Operation, OperationStatus, ServiceType } from './entities/operation.entity';
import { Milestone } from './entities/milestone.entity';
import { Document } from './entities/document.entity';
import { CostItem } from './entities/cost-item.entity';
import { CreateOperationDto } from './dto/create-operation.dto';
import { AddMilestoneDto } from './dto/add-milestone.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { AddCostDto } from './dto/add-cost.dto';

@Injectable()
export class OperationsService {
  constructor(
    @InjectRepository(Operation) private readonly operations: Repository<Operation>,
    @InjectRepository(Milestone) private readonly milestones: Repository<Milestone>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(CostItem) private readonly costs: Repository<CostItem>,
    private readonly clients: ClientsService,
    private readonly events: EventsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Crea una operación y su primer hito (CREATED) en una sola transacción,
   * escribiendo el evento en el outbox atómicamente (US2.1, US2.4).
   */
  async create(tenantId: string, dto: CreateOperationDto): Promise<Operation> {
    // Valida que el cliente pertenezca al tenant (lanza si no existe).
    await this.clients.get(tenantId, dto.clientId);

    const now = new Date();
    let event!: DomainEvent;

    const operation = await this.dataSource.transaction(async (manager) => {
      const op = await manager.getRepository(Operation).save({
        tenantId,
        clientId: dto.clientId,
        reference: dto.reference,
        serviceType: dto.serviceType ?? ServiceType.FREIGHT,
        status: OperationStatus.CREATED,
        origin: dto.origin ?? null,
        destination: dto.destination ?? null,
      });

      await manager.getRepository(Milestone).save({
        tenantId,
        operationId: op.id,
        status: OperationStatus.CREATED,
        occurredAt: now,
        recordedBy: null,
        note: 'Operación creada',
      });

      event = {
        tenantId,
        type: DomainEventType.OPERATION_CREATED,
        entity: 'Operation',
        entityId: op.id,
        payload: { clientId: op.clientId, reference: op.reference },
        occurredAt: now,
      };
      // Persiste el evento en el outbox dentro de la transacción.
      await this.events.record(event, manager);

      return op;
    });

    // Despacha en memoria tras el commit, para que los handlers lean datos ya confirmados.
    this.events.dispatch(event);
    return operation;
  }

  /** Registra un hito y avanza el estado de la operación (US2.2, US2.4). */
  async addMilestone(
    tenantId: string,
    operationId: string,
    dto: AddMilestoneDto,
  ): Promise<Milestone> {
    const operation = await this.get(tenantId, operationId);
    const occurredAt = dto.occurredAt ? new Date(dto.occurredAt) : new Date();
    let event!: DomainEvent;

    const milestone = await this.dataSource.transaction(async (manager) => {
      const saved = await manager.getRepository(Milestone).save({
        tenantId,
        operationId: operation.id,
        status: dto.status,
        occurredAt,
        recordedBy: dto.recordedBy ?? null,
        note: dto.note ?? null,
      });

      await manager
        .getRepository(Operation)
        .update({ id: operation.id, tenantId }, { status: dto.status });

      event = {
        tenantId,
        type: DomainEventType.OPERATION_MILESTONE_ADDED,
        entity: 'Operation',
        entityId: operation.id,
        payload: { status: dto.status, occurredAt: occurredAt.toISOString() },
        occurredAt,
      };
      await this.events.record(event, manager);

      return saved;
    });

    this.events.dispatch(event);
    return milestone;
  }

  /** Adjunta un documento (US2.3). */
  async addDocument(
    tenantId: string,
    operationId: string,
    dto: AddDocumentDto,
  ): Promise<Document> {
    const operation = await this.get(tenantId, operationId);
    const document = await this.documents.save({
      tenantId,
      operationId: operation.id,
      type: dto.type,
      fileName: dto.fileName,
      storageKey: dto.storageKey,
      contentType: dto.contentType ?? null,
    });

    await this.events.publish({
      tenantId,
      type: DomainEventType.OPERATION_DOCUMENT_ADDED,
      entity: 'Operation',
      entityId: operation.id,
      payload: { documentId: document.id, type: document.type },
      occurredAt: new Date(),
    });

    return document;
  }

  /** Registra un costo real contra la operación (US2.5). */
  async addCost(tenantId: string, operationId: string, dto: AddCostDto): Promise<CostItem> {
    const operation = await this.get(tenantId, operationId);
    const cost = await this.costs.save({
      tenantId,
      operationId: operation.id,
      concept: dto.concept,
      amountMinor: String(dto.amountMinor),
      currency: dto.currency ?? 'USD',
      supplier: dto.supplier ?? null,
    });

    await this.events.publish({
      tenantId,
      type: DomainEventType.OPERATION_COST_ADDED,
      entity: 'Operation',
      entityId: operation.id,
      payload: { costId: cost.id, amountMinor: cost.amountMinor, currency: cost.currency },
      occurredAt: new Date(),
    });

    return cost;
  }

  list(tenantId: string, clientId?: string): Promise<Operation[]> {
    return this.operations.find({
      where: clientId ? { tenantId, clientId } : { tenantId },
      order: { createdAt: 'DESC' },
    });
  }

  async get(tenantId: string, id: string): Promise<Operation> {
    const operation = await this.operations.findOne({ where: { tenantId, id } });
    if (!operation) {
      throw new NotFoundException('Operación no encontrada');
    }
    return operation;
  }

  getMilestones(tenantId: string, operationId: string): Promise<Milestone[]> {
    return this.milestones.find({
      where: { tenantId, operationId },
      order: { occurredAt: 'ASC' },
    });
  }
}
