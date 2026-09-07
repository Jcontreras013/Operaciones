import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { InvoiceStatus } from '../billing.enums';

/**
 * Factura a un cliente por un período (US3.3). Agrupa los cargos pendientes del
 * cliente en el rango y avanza por los estados draft → approved → issued.
 */
@Entity('invoices')
export class Invoice extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  clientId!: string;

  /** Número legible de factura, único por operador. */
  @Column()
  number!: string;

  @Column({ type: 'timestamptz' })
  periodStart!: Date;

  @Column({ type: 'timestamptz' })
  periodEnd!: Date;

  @Column({ type: 'enum', enum: InvoiceStatus, default: InvoiceStatus.DRAFT })
  status!: InvoiceStatus;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  /** Total de la factura en la menor unidad de la moneda. */
  @Column('bigint', { default: '0' })
  totalMinor!: string;

  @Column({ type: 'timestamptz', nullable: true })
  issuedAt!: Date | null;
}
