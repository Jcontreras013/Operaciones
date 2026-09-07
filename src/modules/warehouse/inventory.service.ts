import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EventsService } from '@modules/events/events.service';
import { DomainEvent, DomainEventType } from '@modules/events/event-types';
import { ClientsService } from '@modules/clients/clients.service';
import { StockItem } from './entities/stock-item.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { MovementType } from './warehouse.enums';
import { WarehouseService } from './warehouse.service';
import { ReceiptDto } from './dto/receipt.dto';
import { PickDto } from './dto/pick.dto';
import { MoveDto } from './dto/move.dto';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(StockItem) private readonly stock: Repository<StockItem>,
    @InjectRepository(StockMovement) private readonly movements: Repository<StockMovement>,
    private readonly warehouses: WarehouseService,
    private readonly clients: ClientsService,
    private readonly events: EventsService,
    private readonly dataSource: DataSource,
  ) {}

  /** Recepción: ingresa mercancía a una ubicación (US: recepción). */
  async receipt(
    tenantId: string,
    warehouseId: string,
    dto: ReceiptDto,
    userId?: string,
  ): Promise<StockMovement> {
    await this.warehouses.getLocation(tenantId, warehouseId, dto.locationId);
    await this.clients.get(tenantId, dto.clientId);
    const occurredAt = new Date();
    let event!: DomainEvent;

    const movement = await this.dataSource.transaction(async (manager) => {
      await this.addStock(manager, tenantId, warehouseId, dto.locationId, dto.clientId, dto.sku, dto.quantity);
      const mv = await manager.getRepository(StockMovement).save({
        tenantId,
        warehouseId,
        clientId: dto.clientId,
        sku: dto.sku,
        type: MovementType.RECEIPT,
        quantity: dto.quantity,
        fromLocationId: null,
        toLocationId: dto.locationId,
        reference: dto.reference ?? null,
        recordedBy: userId ?? null,
        occurredAt,
      });
      event = this.buildEvent(DomainEventType.WAREHOUSE_RECEIPT, tenantId, mv, occurredAt);
      await this.events.record(event, manager);
      return mv;
    });

    this.events.dispatch(event);
    return movement;
  }

  /** Pick: saca mercancía de una ubicación (US: picking / despacho). */
  async pick(
    tenantId: string,
    warehouseId: string,
    dto: PickDto,
    userId?: string,
  ): Promise<StockMovement> {
    await this.warehouses.getLocation(tenantId, warehouseId, dto.locationId);
    await this.clients.get(tenantId, dto.clientId);
    const occurredAt = new Date();
    let event!: DomainEvent;

    const movement = await this.dataSource.transaction(async (manager) => {
      await this.removeStock(manager, tenantId, dto.locationId, dto.clientId, dto.sku, dto.quantity);
      const mv = await manager.getRepository(StockMovement).save({
        tenantId,
        warehouseId,
        clientId: dto.clientId,
        sku: dto.sku,
        type: MovementType.PICK,
        quantity: dto.quantity,
        fromLocationId: dto.locationId,
        toLocationId: null,
        reference: dto.reference ?? null,
        recordedBy: userId ?? null,
        occurredAt,
      });
      event = this.buildEvent(DomainEventType.WAREHOUSE_PICK, tenantId, mv, occurredAt);
      await this.events.record(event, manager);
      return mv;
    });

    this.events.dispatch(event);
    return movement;
  }

  /** Transferencia entre ubicaciones (putaway / traslado). */
  async move(
    tenantId: string,
    warehouseId: string,
    dto: MoveDto,
    userId?: string,
  ): Promise<StockMovement> {
    if (dto.fromLocationId === dto.toLocationId) {
      throw new BadRequestException('El origen y el destino no pueden ser la misma ubicación');
    }
    await this.warehouses.getLocation(tenantId, warehouseId, dto.fromLocationId);
    await this.warehouses.getLocation(tenantId, warehouseId, dto.toLocationId);
    await this.clients.get(tenantId, dto.clientId);
    const occurredAt = new Date();
    let event!: DomainEvent;

    const movement = await this.dataSource.transaction(async (manager) => {
      await this.removeStock(manager, tenantId, dto.fromLocationId, dto.clientId, dto.sku, dto.quantity);
      await this.addStock(manager, tenantId, warehouseId, dto.toLocationId, dto.clientId, dto.sku, dto.quantity);
      const mv = await manager.getRepository(StockMovement).save({
        tenantId,
        warehouseId,
        clientId: dto.clientId,
        sku: dto.sku,
        type: MovementType.TRANSFER,
        quantity: dto.quantity,
        fromLocationId: dto.fromLocationId,
        toLocationId: dto.toLocationId,
        reference: null,
        recordedBy: userId ?? null,
        occurredAt,
      });
      event = this.buildEvent(DomainEventType.WAREHOUSE_TRANSFER, tenantId, mv, occurredAt);
      await this.events.record(event, manager);
      return mv;
    });

    this.events.dispatch(event);
    return movement;
  }

  /** Inventario actual (filas con cantidad > 0), filtrable por cliente y SKU. */
  getInventory(
    tenantId: string,
    warehouseId: string,
    filters: { clientId?: string; sku?: string } = {},
  ): Promise<StockItem[]> {
    const qb = this.stock
      .createQueryBuilder('s')
      .where('s.tenantId = :tenantId AND s.warehouseId = :warehouseId AND s.quantity > 0', {
        tenantId,
        warehouseId,
      });
    if (filters.clientId) {
      qb.andWhere('s.clientId = :clientId', { clientId: filters.clientId });
    }
    if (filters.sku) {
      qb.andWhere('s.sku = :sku', { sku: filters.sku });
    }
    return qb.orderBy('s.clientId').addOrderBy('s.sku').getMany();
  }

  /** Resumen de inventario agregado por cliente + SKU (suma entre ubicaciones). */
  async getInventorySummary(
    tenantId: string,
    warehouseId: string,
    clientId?: string,
  ): Promise<{ clientId: string; sku: string; quantity: number }[]> {
    const qb = this.stock
      .createQueryBuilder('s')
      .select('s.clientId', 'clientId')
      .addSelect('s.sku', 'sku')
      .addSelect('SUM(s.quantity)', 'quantity')
      .where('s.tenantId = :tenantId AND s.warehouseId = :warehouseId', { tenantId, warehouseId })
      .groupBy('s.clientId')
      .addGroupBy('s.sku')
      .having('SUM(s.quantity) > 0');
    if (clientId) {
      qb.andWhere('s.clientId = :clientId', { clientId });
    }
    const rows = await qb.getRawMany<{ clientId: string; sku: string; quantity: string }>();
    return rows.map((r) => ({ clientId: r.clientId, sku: r.sku, quantity: Number(r.quantity) }));
  }

  getMovements(
    tenantId: string,
    warehouseId: string,
    clientId?: string,
  ): Promise<StockMovement[]> {
    return this.movements.find({
      where: clientId ? { tenantId, warehouseId, clientId } : { tenantId, warehouseId },
      order: { occurredAt: 'DESC' },
      take: 100,
    });
  }

  // --- internos ---

  private async addStock(
    manager: EntityManager,
    tenantId: string,
    warehouseId: string,
    locationId: string,
    clientId: string,
    sku: string,
    quantity: number,
  ): Promise<void> {
    const repo = manager.getRepository(StockItem);
    const existing = await repo.findOne({ where: { tenantId, locationId, clientId, sku } });
    if (existing) {
      existing.quantity += quantity;
      await repo.save(existing);
    } else {
      await repo.save({ tenantId, warehouseId, locationId, clientId, sku, quantity });
    }
  }

  private async removeStock(
    manager: EntityManager,
    tenantId: string,
    locationId: string,
    clientId: string,
    sku: string,
    quantity: number,
  ): Promise<void> {
    const repo = manager.getRepository(StockItem);
    const existing = await repo.findOne({ where: { tenantId, locationId, clientId, sku } });
    if (!existing || existing.quantity < quantity) {
      throw new BadRequestException(
        `Existencia insuficiente de "${sku}" en la ubicación (disponible: ${existing?.quantity ?? 0}, solicitado: ${quantity})`,
      );
    }
    existing.quantity -= quantity;
    await repo.save(existing);
  }

  private buildEvent(
    type: DomainEventType,
    tenantId: string,
    mv: StockMovement,
    occurredAt: Date,
  ): DomainEvent {
    return {
      tenantId,
      type,
      entity: 'StockMovement',
      entityId: mv.id,
      payload: { clientId: mv.clientId, sku: mv.sku, quantity: mv.quantity },
      occurredAt,
    };
  }
}
