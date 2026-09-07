import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { DeliveryStatus } from '../delivery.enums';

/**
 * Entrega (parada) de última milla. Se crea en un pool sin ruta; luego se
 * asigna a una ruta, se ordena al optimizar, se despacha y se cierra con
 * prueba de entrega (POD).
 */
@Entity('deliveries')
export class Delivery extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  clientId!: string;

  /** Operación de origen (opcional): enlaza la última milla con el registro único. */
  @Index()
  @Column('uuid', { nullable: true })
  operationId!: string | null;

  /** Referencia legible (p. ej. número de orden/pedido). */
  @Column()
  reference!: string;

  @Column()
  address!: string;

  @Column('double precision', { nullable: true })
  lat!: number | null;

  @Column('double precision', { nullable: true })
  lng!: number | null;

  @Index()
  @Column('uuid', { nullable: true })
  routeId!: string | null;

  /** Orden dentro de la ruta (lo fija el optimizador). */
  @Column('int', { nullable: true })
  sequence!: number | null;

  @Column({ type: 'enum', enum: DeliveryStatus, default: DeliveryStatus.PENDING })
  status!: DeliveryStatus;

  // --- Prueba de entrega (POD) ---
  @Column({ type: 'timestamptz', nullable: true })
  deliveredAt!: Date | null;

  /** Quién recibió (firma/nombre). */
  @Column({ type: 'varchar', nullable: true })
  receivedBy!: string | null;

  /** Clave de la foto de entrega en el object storage. */
  @Column({ type: 'varchar', nullable: true })
  podPhotoKey!: string | null;

  @Column({ type: 'varchar', nullable: true })
  podNote!: string | null;

  /** Motivo del fallo (si status = failed). */
  @Column({ type: 'varchar', nullable: true })
  failureReason!: string | null;
}
