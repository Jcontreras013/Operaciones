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
 * Separa dos responsabilidades a propósito:
 *  - `record`: persiste el evento en el outbox, idealmente dentro de la misma
 *    transacción que el cambio de negocio (transactional outbox).
 *  - `dispatch`: entrega el evento a los suscriptores en memoria.
 *
 * El despacho debe hacerse DESPUÉS del commit para que los handlers (p. ej. el
 * motor de facturación) lean datos ya confirmados y no una transacción en vuelo.
 * `publish` combina ambos para flujos sin transacción explícita.
 *
 * Cuando el volumen lo exija, el despacho en memoria se reemplaza por un worker
 * que lee las filas no despachadas del outbox y publica en Kafka/NATS — sin
 * cambiar a los productores.
 */
@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private readonly emitter = new EventEmitter();

  /** Suscribe un handler a un tipo de evento. Los errores se registran, no propagan. */
  on(type: DomainEventType, handler: Handler): void {
    this.emitter.on(type, (event: DomainEvent) => {
      Promise.resolve(handler(event)).catch((err) =>
        this.logger.error(`Error en handler de ${type}: ${String(err)}`),
      );
    });
  }

  constructor(
    @InjectRepository(OutboxEvent)
    private readonly outboxRepo: Repository<OutboxEvent>,
  ) {}

  /**
   * Persiste un evento en el outbox.
   * @param manager EntityManager de una transacción en curso, para escribir el
   *   outbox atómicamente con el cambio de negocio. Si se omite, usa el repo.
   */
  async record(event: DomainEvent, manager?: EntityManager): Promise<void> {
    const row = {
      tenantId: event.tenantId,
      type: event.type,
      entity: event.entity,
      entityId: event.entityId,
      payload: event.payload,
      occurredAt: event.occurredAt,
      dispatchedAt: null,
    };
    const repo = manager ? manager.getRepository(OutboxEvent) : this.outboxRepo;
    await repo.save(row);
  }

  /** Entrega el evento a los suscriptores en memoria. Llamar tras el commit. */
  dispatch(event: DomainEvent): void {
    this.emitter.emit(event.type, event);
  }

  /**
   * Atajo para flujos sin transacción explícita: persiste y despacha.
   * En flujos transaccionales, usar `record(event, manager)` dentro de la
   * transacción y `dispatch(event)` después del commit.
   */
  async publish(event: DomainEvent, manager?: EntityManager): Promise<void> {
    await this.record(event, manager);
    if (!manager) {
      this.dispatch(event);
    }
  }
}
