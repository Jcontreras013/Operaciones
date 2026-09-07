import { Column, Entity, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Vehículo de la flota propia del operador. */
@Entity('vehicles')
@Unique(['tenantId', 'plate'])
export class Vehicle extends TenantOwnedEntity {
  /** Patente / placa, única por operador. */
  @Column()
  plate!: string;

  @Column()
  name!: string;

  /** Capacidad en unidades (para futuras restricciones de ruteo). */
  @Column('int', { nullable: true })
  capacity!: number | null;

  @Column({ default: true })
  active!: boolean;
}
