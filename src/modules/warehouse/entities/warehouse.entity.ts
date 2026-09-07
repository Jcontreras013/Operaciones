import { Column, Entity, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Almacén físico del operador (Fase 1, WMS). */
@Entity('warehouses')
@Unique(['tenantId', 'code'])
export class Warehouse extends TenantOwnedEntity {
  /** Código corto del almacén, único por operador. */
  @Column()
  code!: string;

  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  address!: string | null;

  @Column({ default: true })
  active!: boolean;
}
