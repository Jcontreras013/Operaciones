import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { AssignmentType, RouteStatus } from '../delivery.enums';

/**
 * Ruta de reparto de una fecha, asignada a flota propia o a un carrier 3PL
 * (orquestación). Agrupa entregas (paradas) que se optimizan y despachan juntas.
 */
@Entity('routes')
export class Route extends TenantOwnedEntity {
  /** Fecha de reparto (YYYY-MM-DD). */
  @Index()
  @Column({ type: 'date' })
  date!: string;

  @Column({ type: 'enum', enum: AssignmentType })
  assignmentType!: AssignmentType;

  /** Vehículo propio (si assignmentType = own). */
  @Column('uuid', { nullable: true })
  vehicleId!: string | null;

  /** Conductor de la flota propia (nombre, MVP). */
  @Column({ type: 'varchar', nullable: true })
  driverName!: string | null;

  /** Carrier 3PL (si assignmentType = carrier). */
  @Column('uuid', { nullable: true })
  carrierId!: string | null;

  @Column({ type: 'enum', enum: RouteStatus, default: RouteStatus.PLANNED })
  status!: RouteStatus;

  /** Punto de partida para optimizar (depósito), opcional. */
  @Column('double precision', { nullable: true })
  originLat!: number | null;

  @Column('double precision', { nullable: true })
  originLng!: number | null;

  /** Distancia total estimada (km) tras optimizar. */
  @Column('double precision', { nullable: true })
  estimatedKm!: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  dispatchedAt!: Date | null;
}
