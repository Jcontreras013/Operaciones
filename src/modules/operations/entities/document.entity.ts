import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/** Tipos de documento habituales en una operación 3PL. */
export enum DocumentType {
  BILL_OF_LADING = 'bill_of_lading',
  COMMERCIAL_INVOICE = 'commercial_invoice',
  PACKING_LIST = 'packing_list',
  PROOF_OF_DELIVERY = 'proof_of_delivery',
  CUSTOMS = 'customs',
  OTHER = 'other',
}

/** Documento adjunto a una operación (US2.3). */
@Entity('documents')
export class Document extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  operationId!: string;

  @Column({ type: 'enum', enum: DocumentType, default: DocumentType.OTHER })
  type!: DocumentType;

  @Column()
  fileName!: string;

  /** Ubicación del archivo (ej. clave en object storage). */
  @Column()
  storageKey!: string;

  @Column({ type: 'varchar', nullable: true })
  contentType!: string | null;
}
