import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Roles del operador (E1). El acceso del cliente al portal es otra entidad.
 *
 * ADMIN/OPS/FINANCE/READONLY son del 3PL general (Fase 0). JEFE/MONITOREO/
 * LLAMADOS son específicos del dominio telecom migrado de monitor-operativo
 * (Monitor/Red/Calidad — Fase D) y reflejan el modelo de roles que ya
 * conocía el equipo ahí; se validan de verdad con `RolesGuard`
 * (`@common/auth/roles.guard`), a diferencia de los cuatro genéricos, que
 * hoy son solo metadata (ningún guard los exige todavía).
 */
export enum UserRole {
  ADMIN = 'admin',
  OPS = 'ops',
  FINANCE = 'finance',
  READONLY = 'readonly',
  JEFE = 'jefe',
  MONITOREO = 'monitoreo',
  LLAMADOS = 'llamados',
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
