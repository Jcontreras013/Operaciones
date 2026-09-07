import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Estados del ciclo de vida de una operación (US2.2). */
export enum OperationStatus {
  CREATED = 'created',
  IN_TRANSIT = 'in_transit',
  IN_WAREHOUSE = 'in_warehouse',
  DELIVERED = 'delivered',
  CLOSED = 'closed',
}

export enum ServiceType {
  FREIGHT = 'freight',
  WAREHOUSING = 'warehousing',
  LAST_MILE = 'last_mile',
  CUSTOMS = 'customs',
  OTHER = 'other',
}

/**
 * Registro único de operación (E2): un solo objeto que acumula todo el ciclo
 * de vida. Un dato se ingresa una vez aquí y fluye por visibilidad y
 * facturación vía eventos — cero doble captura.
 */
@Entity('operations')
export class Operation extends TenantOwnedEntity {
  /** Cliente dueño de la carga. */
  @Index()
  @Column('uuid')
  clientId!: string;

  /** Referencia legible del operador (ej. número de orden). */
  @Index()
  @Column()
  reference!: string;

  @Column({ type: 'enum', enum: ServiceType, default: ServiceType.FREIGHT })
  serviceType!: ServiceType;

  @Column({ type: 'enum', enum: OperationStatus, default: OperationStatus.CREATED })
  status!: OperationStatus;

  @Column({ type: 'varchar', nullable: true })
  origin!: string | null;

  @Column({ type: 'varchar', nullable: true })
  destination!: string | null;
}
