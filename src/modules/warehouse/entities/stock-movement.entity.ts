import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { MovementType } from '../warehouse.enums';

/**
 * Log inmutable de movimientos de inventario (recepción, transferencia, pick,
 * ajuste). Es la traza de auditoría del almacén y la base para reconstruir el
 * inventario o alimentar la facturación por actividad.
 */
@Entity('stock_movements')
export class StockMovement extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  warehouseId!: string;

  @Index()
  @Column('uuid')
  clientId!: string;

  @Index()
  @Column()
  sku!: string;

  @Column({ type: 'enum', enum: MovementType })
  type!: MovementType;

  @Column('int')
  quantity!: number;

  /** Origen (nulo en recepción). */
  @Column('uuid', { nullable: true })
  fromLocationId!: string | null;

  /** Destino (nulo en pick). */
  @Column('uuid', { nullable: true })
  toLocationId!: string | null;

  /** Referencia externa (p. ej. operación u orden). */
  @Column({ type: 'varchar', nullable: true })
  reference!: string | null;

  @Column('uuid', { nullable: true })
  recordedBy!: string | null;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;
}
