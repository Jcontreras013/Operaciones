import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Cliente del operador: el dueño de la carga en cuyo nombre se opera (US1.2). */
@Entity('clients')
export class Client extends TenantOwnedEntity {
  @Index()
  @Column()
  name!: string;

  /** Código interno del cliente en el operador (ej. para referencias). */
  @Column({ type: 'varchar', nullable: true })
  code!: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactEmail!: string | null;

  @Column({ type: 'varchar', nullable: true })
  contactName!: string | null;

  @Column({ default: true })
  active!: boolean;
}
