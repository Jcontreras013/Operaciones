import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Línea de factura, generada desde un ChargeItem (US3.3). */
@Entity('invoice_lines')
export class InvoiceLine extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  invoiceId!: string;

  @Column('uuid')
  chargeItemId!: string;

  @Column()
  description!: string;

  @Column('int')
  quantity!: number;

  @Column('bigint')
  rateMinor!: string;

  @Column('bigint')
  amountMinor!: string;
}
