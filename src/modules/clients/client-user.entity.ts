import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Usuario del cliente con acceso de solo-lectura al portal (US1.4).
 *
 * A diferencia de User (que pertenece al operador), un ClientUser está atado a
 * un cliente concreto. El portal deriva el `clientId` de este registro tras
 * autenticar — nunca lo toma del request.
 */
@Entity('client_users')
@Unique(['tenantId', 'email'])
export class ClientUser extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  clientId!: string;

  @Index()
  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column({ default: true })
  active!: boolean;
}
