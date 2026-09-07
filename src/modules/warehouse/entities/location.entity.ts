import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { LocationKind } from '../warehouse.enums';

/** Ubicación (bin) dentro de un almacén. */
@Entity('locations')
@Unique(['warehouseId', 'code'])
export class Location extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  warehouseId!: string;

  /** Código de la ubicación, único dentro del almacén (p. ej. A-01-02). */
  @Column()
  code!: string;

  @Column({ type: 'enum', enum: LocationKind, default: LocationKind.STORAGE })
  kind!: LocationKind;

  @Column({ default: true })
  active!: boolean;
}
