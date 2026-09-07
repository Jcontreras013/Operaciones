import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { ChargeType } from '../billing.enums';

/**
 * Cargo calculado contra una operación (salida del motor de facturación).
 *
 * Se deriva de un evento + una regla de tarifa (o se crea manualmente para VAS).
 * Un cargo sin `invoiceId` está pendiente de facturar; al generar la factura se
 * enlaza y deja de estar disponible para otra.
 */
@Entity('charge_items')
export class ChargeItem extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  clientId!: string;

  @Index()
  @Column('uuid')
  operationId!: string;

  @Column({ type: 'enum', enum: ChargeType })
  chargeType!: ChargeType;

  @Column()
  description!: string;

  /** Cantidad (días, movimientos, ítems…). */
  @Column('int')
  quantity!: number;

  /** Tarifa unitaria en la menor unidad de la moneda. */
  @Column('bigint')
  rateMinor!: string;

  /** Monto total del cargo = rateMinor × quantity, en la menor unidad. */
  @Column('bigint')
  amountMinor!: string;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  /** Regla que originó el cargo (nulo si fue manual). */
  @Column('uuid', { nullable: true })
  rateRuleId!: string | null;

  /** Factura a la que quedó enlazado (nulo si está pendiente). */
  @Index()
  @Column('uuid', { nullable: true })
  invoiceId!: string | null;
}
