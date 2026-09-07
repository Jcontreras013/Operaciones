import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { DomainEventType } from './event-types';

/**
 * Registro inmutable de eventos (patrón outbox).
 *
 * Cada evento del dominio se persiste aquí en la misma transacción que el
 * cambio que lo origina. Un despachador lo entrega a los consumidores y marca
 * `dispatchedAt`. En Fase 0 el despacho es en memoria; al escalar, un worker
 * leerá las filas no despachadas y las publicará en Kafka/NATS.
 */
@Entity('outbox_events')
export class OutboxEvent extends TenantOwnedEntity {
  @Index()
  @Column({ type: 'enum', enum: DomainEventType })
  type!: DomainEventType;

  @Column()
  entity!: string;

  @Index()
  @Column('uuid')
  entityId!: string;

  @Column('jsonb')
  payload!: Record<string, unknown>;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  dispatchedAt!: Date | null;
}
