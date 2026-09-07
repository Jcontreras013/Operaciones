import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';
import { OperationStatus } from './operation.entity';

/** Hito/estado de una operación con timestamp y autor (US2.2). */
@Entity('milestones')
export class Milestone extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  operationId!: string;

  @Column({ type: 'enum', enum: OperationStatus })
  status!: OperationStatus;

  @Column({ type: 'timestamptz' })
  occurredAt!: Date;

  /** Usuario que registró el hito (US2.2). */
  @Column('uuid', { nullable: true })
  recordedBy!: string | null;

  @Column({ nullable: true })
  note!: string | null;
}
