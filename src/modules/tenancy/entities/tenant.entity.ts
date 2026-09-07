import { Column, Entity } from 'typeorm';
import { BaseEntity } from '@common/database/base.entity';

/** Operador logístico 3PL. Raíz del aislamiento multi-tenant. */
@Entity('tenants')
export class Tenant extends BaseEntity {
  @Column()
  name!: string;

  /** Identificador legible para URLs/subdominios, único. */
  @Column({ unique: true })
  slug!: string;

  @Column({ default: true })
  active!: boolean;
}
