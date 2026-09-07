import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { EventsService } from '@modules/events/events.service';
import { DomainEvent, DomainEventType } from '@modules/events/event-types';
import { ClientsService } from '@modules/clients/clients.service';
import { Delivery } from './entities/delivery.entity';
import { Route } from './entities/route.entity';
import { AssignmentType, DeliveryStatus, RouteStatus } from './delivery.enums';
import { FleetService } from './fleet.service';
import { ROUTE_OPTIMIZER, RouteOptimizer } from './routing/route-optimizer';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreateRouteDto } from './dto/create-route.dto';
import { CompleteDeliveryDto } from './dto/complete-delivery.dto';
import { FailDeliveryDto } from './dto/fail-delivery.dto';

@Injectable()
export class DeliveryService {
  constructor(
    @InjectRepository(Delivery) private readonly deliveries: Repository<Delivery>,
    @InjectRepository(Route) private readonly routes: Repository<Route>,
    private readonly fleet: FleetService,
    private readonly clients: ClientsService,
    private readonly events: EventsService,
    @Inject(ROUTE_OPTIMIZER) private readonly optimizer: RouteOptimizer,
    private readonly dataSource: DataSource,
  ) {}

  // --- Entregas (pool) ---

  async createDelivery(tenantId: string, dto: CreateDeliveryDto): Promise<Delivery> {
    await this.clients.get(tenantId, dto.clientId);
    const delivery = await this.deliveries.save({
      tenantId,
      clientId: dto.clientId,
      operationId: dto.operationId ?? null,
      reference: dto.reference,
      address: dto.address,
      lat: dto.lat ?? null,
      lng: dto.lng ?? null,
      routeId: null,
      sequence: null,
      status: DeliveryStatus.PENDING,
      deliveredAt: null,
      receivedBy: null,
      podPhotoKey: null,
      podNote: null,
      failureReason: null,
    });
    await this.events.publish({
      tenantId,
      type: DomainEventType.DELIVERY_CREATED,
      entity: 'Delivery',
      entityId: delivery.id,
      payload: { clientId: delivery.clientId, reference: delivery.reference },
      occurredAt: new Date(),
    });
    return delivery;
  }

  listDeliveries(
    tenantId: string,
    filters: { status?: DeliveryStatus; routeId?: string; clientId?: string } = {},
  ): Promise<Delivery[]> {
    const where: Record<string, unknown> = { tenantId };
    if (filters.status) where.status = filters.status;
    if (filters.routeId) where.routeId = filters.routeId;
    if (filters.clientId) where.clientId = filters.clientId;
    return this.deliveries.find({ where, order: { createdAt: 'DESC' } });
  }

  async getDelivery(tenantId: string, id: string): Promise<Delivery> {
    const delivery = await this.deliveries.findOne({ where: { tenantId, id } });
    if (!delivery) {
      throw new NotFoundException('Entrega no encontrada');
    }
    return delivery;
  }

  // --- Rutas ---

  /** Crea una ruta validando la asignación (flota propia o carrier). */
  async createRoute(tenantId: string, dto: CreateRouteDto): Promise<Route> {
    if (dto.assignmentType === AssignmentType.OWN) {
      if (!dto.vehicleId) {
        throw new BadRequestException('Una ruta de flota propia requiere vehicleId');
      }
      await this.fleet.getVehicle(tenantId, dto.vehicleId);
    } else {
      if (!dto.carrierId) {
        throw new BadRequestException('Una ruta tercerizada requiere carrierId');
      }
      await this.fleet.getCarrier(tenantId, dto.carrierId);
    }

    return this.routes.save({
      tenantId,
      date: dto.date.slice(0, 10),
      assignmentType: dto.assignmentType,
      vehicleId: dto.assignmentType === AssignmentType.OWN ? dto.vehicleId! : null,
      driverName: dto.driverName ?? null,
      carrierId: dto.assignmentType === AssignmentType.CARRIER ? dto.carrierId! : null,
      status: RouteStatus.PLANNED,
      originLat: dto.originLat ?? null,
      originLng: dto.originLng ?? null,
      estimatedKm: null,
      dispatchedAt: null,
    });
  }

  async getRoute(tenantId: string, id: string): Promise<Route> {
    const route = await this.routes.findOne({ where: { tenantId, id } });
    if (!route) {
      throw new NotFoundException('Ruta no encontrada');
    }
    return route;
  }

  /** Paradas de una ruta ordenadas por secuencia (tras optimizar). */
  async getRouteStops(tenantId: string, routeId: string): Promise<Delivery[]> {
    await this.getRoute(tenantId, routeId);
    return this.deliveries.find({
      where: { tenantId, routeId },
      order: { sequence: 'ASC', createdAt: 'ASC' },
    });
  }

  listRoutes(tenantId: string, date?: string): Promise<Route[]> {
    return this.routes.find({
      where: date ? { tenantId, date } : { tenantId },
      order: { date: 'DESC', createdAt: 'DESC' },
    });
  }

  /** Asigna entregas del pool a una ruta planificada. */
  async assignStops(tenantId: string, routeId: string, deliveryIds: string[]): Promise<Delivery[]> {
    const route = await this.getRoute(tenantId, routeId);
    if (route.status !== RouteStatus.PLANNED) {
      throw new BadRequestException('Solo se pueden asignar paradas a una ruta planificada');
    }
    const found = await this.deliveries.find({ where: { tenantId, id: In(deliveryIds) } });
    if (found.length !== deliveryIds.length) {
      throw new BadRequestException('Alguna entrega no existe en este operador');
    }
    for (const d of found) {
      if (d.status !== DeliveryStatus.PENDING) {
        throw new BadRequestException(`La entrega ${d.reference} no está pendiente`);
      }
    }
    for (const d of found) {
      d.routeId = routeId;
      d.status = DeliveryStatus.ASSIGNED;
    }
    return this.deliveries.save(found);
  }

  /** Optimiza el orden de las paradas de la ruta con el optimizador enchufado. */
  async optimizeRoute(tenantId: string, routeId: string): Promise<Delivery[]> {
    const route = await this.getRoute(tenantId, routeId);
    const stops = await this.deliveries.find({ where: { tenantId, routeId } });
    if (stops.length === 0) {
      throw new BadRequestException('La ruta no tiene paradas para optimizar');
    }

    const result = this.optimizer.optimize({
      origin:
        route.originLat !== null && route.originLng !== null
          ? { lat: route.originLat, lng: route.originLng }
          : undefined,
      stops: stops.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng })),
    });

    const byId = new Map(stops.map((s) => [s.id, s]));
    result.orderedStopIds.forEach((id, index) => {
      const stop = byId.get(id);
      if (stop) stop.sequence = index + 1;
    });
    await this.deliveries.save(stops);
    route.estimatedKm = result.estimatedKm;
    await this.routes.save(route);

    return stops.sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0));
  }

  /** Despacha la ruta: pasa a en reparto todas sus paradas. */
  async dispatchRoute(tenantId: string, routeId: string): Promise<Route> {
    const route = await this.getRoute(tenantId, routeId);
    if (route.status !== RouteStatus.PLANNED) {
      throw new BadRequestException('La ruta ya fue despachada');
    }
    const stops = await this.deliveries.find({ where: { tenantId, routeId } });
    if (stops.length === 0) {
      throw new BadRequestException('No se puede despachar una ruta sin paradas');
    }

    const occurredAt = new Date();
    let event!: DomainEvent;
    const updated = await this.dataSource.transaction(async (manager) => {
      await manager
        .getRepository(Delivery)
        .update({ tenantId, routeId }, { status: DeliveryStatus.EN_ROUTE });
      route.status = RouteStatus.DISPATCHED;
      route.dispatchedAt = occurredAt;
      const saved = await manager.getRepository(Route).save(route);
      event = {
        tenantId,
        type: DomainEventType.ROUTE_DISPATCHED,
        entity: 'Route',
        entityId: routeId,
        payload: { stops: stops.length, assignmentType: route.assignmentType },
        occurredAt,
      };
      await this.events.record(event, manager);
      return saved;
    });

    this.events.dispatch(event);
    return updated;
  }

  // --- Prueba de entrega ---

  /** Cierra una entrega con prueba de entrega (POD). */
  async completeDelivery(
    tenantId: string,
    deliveryId: string,
    dto: CompleteDeliveryDto,
  ): Promise<Delivery> {
    const delivery = await this.getDelivery(tenantId, deliveryId);
    if (delivery.status !== DeliveryStatus.EN_ROUTE) {
      throw new BadRequestException('Solo se puede entregar una parada en reparto (en_route)');
    }
    delivery.status = DeliveryStatus.DELIVERED;
    delivery.deliveredAt = new Date();
    delivery.receivedBy = dto.receivedBy;
    delivery.podPhotoKey = dto.podPhotoKey ?? null;
    delivery.podNote = dto.podNote ?? null;
    const saved = await this.deliveries.save(delivery);

    await this.events.publish({
      tenantId,
      type: DomainEventType.DELIVERY_DELIVERED,
      entity: 'Delivery',
      entityId: delivery.id,
      payload: { clientId: delivery.clientId, operationId: delivery.operationId },
      occurredAt: delivery.deliveredAt,
    });
    await this.maybeCompleteRoute(tenantId, delivery.routeId);
    return saved;
  }

  /** Marca una entrega como fallida. */
  async failDelivery(
    tenantId: string,
    deliveryId: string,
    dto: FailDeliveryDto,
  ): Promise<Delivery> {
    const delivery = await this.getDelivery(tenantId, deliveryId);
    if (delivery.status !== DeliveryStatus.EN_ROUTE) {
      throw new BadRequestException('Solo se puede marcar fallida una parada en reparto');
    }
    delivery.status = DeliveryStatus.FAILED;
    delivery.failureReason = dto.reason;
    const saved = await this.deliveries.save(delivery);

    await this.events.publish({
      tenantId,
      type: DomainEventType.DELIVERY_FAILED,
      entity: 'Delivery',
      entityId: delivery.id,
      payload: { clientId: delivery.clientId, reason: dto.reason },
      occurredAt: new Date(),
    });
    await this.maybeCompleteRoute(tenantId, delivery.routeId);
    return saved;
  }

  /** Cierra la ruta cuando ya no quedan paradas activas. */
  private async maybeCompleteRoute(tenantId: string, routeId: string | null): Promise<void> {
    if (!routeId) return;
    const pending = await this.deliveries.count({
      where: [
        { tenantId, routeId, status: DeliveryStatus.ASSIGNED },
        { tenantId, routeId, status: DeliveryStatus.EN_ROUTE },
      ],
    });
    if (pending === 0) {
      await this.routes.update({ tenantId, id: routeId }, { status: RouteStatus.COMPLETED });
    }
  }
}
