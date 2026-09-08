import { Column, Entity } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Registro de una corrida de ingesta (reemplaza al sync_job.py del monitor).
 * Sirve de observabilidad: cuándo se sincronizó, cuántas órdenes, y si falló.
 */
@Entity('ingest_runs')
export class IngestRun extends TenantOwnedEntity {
  @Column({ default: 'cepheus' })
  source!: string;

  /** Fecha desde la que se pidieron las órdenes. */
  @Column({ type: 'timestamptz' })
  requestedFrom!: Date;

  @Column({ default: 'ok' })
  status!: string;

  @Column('int', { default: 0 })
  fetched!: number;

  @Column('int', { default: 0 })
  created!: number;

  @Column('int', { default: 0 })
  updated!: number;

  @Column({ type: 'varchar', nullable: true })
  error!: string | null;
}
