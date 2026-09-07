import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { InvoiceExportStatus } from '../billing.enums';

/**
 * Registro de un intento de exportación de una factura al ERP (US3.5).
 *
 * Guarda el payload canónico enviado, el resultado y la referencia del ERP.
 * Sirve de auditoría y de base para la idempotencia (no re-exportar una
 * factura ya exportada con éxito).
 */
@Entity('invoice_exports')
export class InvoiceExport extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  invoiceId!: string;

  @Column({ type: 'enum', enum: InvoiceExportStatus })
  status!: InvoiceExportStatus;

  /** Referencia del documento en el ERP (presente si status = exported). */
  @Column({ type: 'varchar', nullable: true })
  externalRef!: string | null;

  /** Payload canónico enviado al ERP. */
  @Column('jsonb')
  payload!: Record<string, unknown>;

  /** Mensaje de error (presente si status = failed). */
  @Column({ type: 'varchar', nullable: true })
  error!: string | null;

  @Column({ type: 'timestamptz', nullable: true })
  exportedAt!: Date | null;
}
