import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Roles del operador (E1). El acceso del cliente al portal es otra entidad. */
export enum UserRole {
  ADMIN = 'admin',
  OPS = 'ops',
  FINANCE = 'finance',
  READONLY = 'readonly',
}

@Entity('users')
@Unique(['tenantId', 'email'])
export class User extends TenantOwnedEntity {
  @Index()
  @Column()
  email!: string;

  @Column()
  name!: string;

  @Column({ type: 'enum', enum: UserRole, default: UserRole.OPS })
  role!: UserRole;

  /** Hash bcrypt de la contraseña. Nunca se expone en respuestas. */
  @Column({ type: 'varchar', nullable: true, select: false })
  passwordHash!: string | null;

  @Column({ default: true })
  active!: boolean;
}
