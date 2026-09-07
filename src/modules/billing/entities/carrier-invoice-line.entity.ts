import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Línea de una factura de carrier: lo que el carrier cobra por una operación.
 *
 * Al conciliar se rellenan `recordedMinor` (suma de los CostItem de esa
 * operación para el mismo proveedor) y `varianceMinor` = declarado − registrado.
 */
@Entity('carrier_invoice_lines')
export class CarrierInvoiceLine extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  carrierInvoiceId!: string;

  @Index()
  @Column('uuid')
  operationId!: string;

  @Column()
  concept!: string;

  /** Monto declarado por el carrier para esta operación, en la menor unidad. */
  @Column('bigint')
  declaredMinor!: string;

  /** Costo registrado en la operación para ese proveedor (nulo hasta conciliar). */
  @Column('bigint', { nullable: true })
  recordedMinor!: string | null;

  /** Diferencia declarado − registrado (nulo hasta conciliar). */
  @Column('bigint', { nullable: true })
  varianceMinor!: string | null;
}
