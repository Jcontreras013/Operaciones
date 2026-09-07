import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { ChargeType, RateUnit } from '../billing.enums';
import { OperationStatus } from '@modules/operations/entities/operation.entity';

/**
 * Regla de tarifa dentro de una rate card (US3.1).
 *
 * El motor la usa para derivar cargos desde los eventos de la operación:
 *  - `triggerStatus` (opcional) dispara la regla cuando la operación alcanza
 *    ese estado (p. ej. HANDLING al llegar IN_WAREHOUSE).
 *  - Sin `triggerStatus`, la regla PER_SERVICE se aplica al crear la operación,
 *    y las demás (VAS, PICK_PACK, STORAGE) se registran manualmente o al cierre.
 */
@Entity('rate_rules')
export class RateRule extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  rateCardId!: string;

  @Column({ type: 'enum', enum: ChargeType })
  chargeType!: ChargeType;

  @Column()
  description!: string;

  /** Tarifa en la menor unidad de la moneda (ej. centavos). */
  @Column('bigint')
  rateMinor!: string;

  @Column({ type: 'enum', enum: RateUnit })
  unit!: RateUnit;

  /** Estado de la operación que dispara la regla automáticamente (opcional). */
  @Column({ type: 'enum', enum: OperationStatus, nullable: true })
  triggerStatus!: OperationStatus | null;

  @Column({ default: true })
  active!: boolean;
}
