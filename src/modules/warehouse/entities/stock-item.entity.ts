import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Existencia actual de un SKU de un cliente en una ubicación (inventario en
 * tiempo real). El inventario se segmenta por cliente: cada cliente ve solo lo
 * suyo aunque comparta almacén con otros (multi-tenant + multi-cliente).
 */
@Entity('stock_items')
@Unique(['tenantId', 'locationId', 'clientId', 'sku'])
export class StockItem extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  warehouseId!: string;

  @Index()
  @Column('uuid')
  locationId!: string;

  @Index()
  @Column('uuid')
  clientId!: string;

  @Index()
  @Column()
  sku!: string;

  /** Cantidad en unidades. Nunca negativa. */
  @Column('int', { default: 0 })
  quantity!: number;
}
