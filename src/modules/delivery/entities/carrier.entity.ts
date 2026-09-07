import { Column, Entity } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Carrier tercerizado (3PL) al que se le puede asignar una ruta. */
@Entity('carriers')
export class Carrier extends TenantOwnedEntity {
  @Column()
  name!: string;

  @Column({ type: 'varchar', nullable: true })
  contactEmail!: string | null;

  @Column({ default: true })
  active!: boolean;
}
