import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { CarrierInvoiceStatus } from '../billing.enums';

/**
 * Factura recibida de un carrier/proveedor (US3.4).
 *
 * Finanzas la registra y la concilia contra los costos reales que se anotaron
 * en cada operación (CostItem) antes de facturar al cliente. La conciliación
 * detecta si el carrier cobró más (o menos) de lo esperado.
 */
@Entity('carrier_invoices')
export class CarrierInvoice extends TenantOwnedEntity {
  /** Carrier/proveedor emisor. Debe coincidir con CostItem.supplier para casar. */
  @Index()
  @Column()
  supplier!: string;

  /** Número de factura del carrier. */
  @Column()
  number!: string;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  /** Total declarado por el carrier, en la menor unidad. */
  @Column('bigint')
  declaredMinor!: string;

  @Column({ type: 'enum', enum: CarrierInvoiceStatus, default: CarrierInvoiceStatus.PENDING })
  status!: CarrierInvoiceStatus;

  @Column({ type: 'timestamptz', nullable: true })
  reconciledAt!: Date | null;

  @Column({ type: 'varchar', nullable: true })
  note!: string | null;
}
