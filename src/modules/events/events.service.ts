import { EventEmitter } from 'node:events';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { OutboxEvent } from './outbox-event.entity';
import { DomainEvent, DomainEventType } from './event-types';

type Handler = (event: DomainEvent) => void | Promise<void>;

/**
 * Bus de eventos del dominio (Fase 0).
 *
 * `publish` persiste el evento en el outbox (idealmente dentro de la misma
 * transacción que el cambio de negocio, pasando el EntityManager) y luego lo
 * despacha en memoria a los suscriptores. Cuando el volumen lo exija, el
 * despacho en memoria se reemplaza por un worker que lee el outbox y publica
 * en un broker — sin cambiar a los productores.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly emitter = new EventEmitter();

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
  ) {}

  /** Suscribe un handler a un tipo de evento. */
  on(type: DomainEventType, handler: Handler): void {
    this.emitter.on(type, (event: DomainEvent) => {
      Promise.resolve(handler(event)).catch((err) =>
        this.logger.error(`Error en handler de ${type}: ${String(err)}`),
      );
    });
  }

  /**
   * Persiste y despacha un evento.
   * @param manager EntityManager de una transacción en curso, para escribir el
   *   outbox atómicamente con el cambio de negocio. Si se omite, usa el repo.
   */
  async publish(event: DomainEvent, manager?: EntityManager): Promise<void> {
    const row = {
      tenantId: event.tenantId,
      type: event.type,
      entity: event.entity,
      entityId: event.entityId,
      payload: event.payload,
      occurredAt: event.occurredAt,
      dispatchedAt: null,
    };

    if (manager) {
      await manager.getRepository(OutboxEvent).save(row);
    } else {
      await this.outboxRepo.save(row);
    }

    // Despacho en memoria (Fase 0).
    this.emitter.emit(event.type, event);
  }
}
