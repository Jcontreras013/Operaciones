import { Column, Entity, Index, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Orden de campo (telecom FTTH) ingerida desde Cepheus. Modela los campos que
 * usa el monitor y conserva la orden cruda completa en `raw` (JSONB) para no
 * perder nada y poder derivar analítica (offline, OLT/PON, tiempos) después.
 *
 * `externalNum` (NUM de Cepheus) identifica la orden: la ingesta hace upsert
 * por (tenantId, externalNum) para ser idempotente.
 */
@Entity('work_orders')
@Unique(['tenantId', 'externalNum'])
export class WorkOrder extends TenantOwnedEntity {
  @Index()
  @Column()
  externalNum!: string;

  @Column({ type: 'varchar', nullable: true })
  cliente!: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  tecnico!: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  actividad!: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  estado!: string | null;

  @Column({ type: 'varchar', nullable: true })
  tipoOrden!: string | null;

  @Column({ type: 'varchar', nullable: true })
  subtipo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  segmento!: string | null;

  @Column({ type: 'varchar', nullable: true })
  grupo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  colonia!: string | null;

  @Index()
  @Column({ type: 'varchar', nullable: true })
  olt!: string | null;

  @Column({ type: 'varchar', nullable: true })
  pon!: string | null;

  @Column({ type: 'varchar', nullable: true })
  causa!: string | null;

  @Column({ type: 'varchar', nullable: true })
  motivo!: string | null;

  @Column({ type: 'varchar', nullable: true })
  comentario!: string | null;

  @Column({ type: 'varchar', nullable: true })
  atribucion!: string | null;

  @Column({ type: 'varchar', nullable: true })
  gps!: string | null;

  @Column({ type: 'varchar', nullable: true })
  mxref!: string | null;

  /** Fecha de apertura, parseada cuando fue posible (para filtrar/ordenar). */
  @Index()
  @Column({ type: 'timestamptz', nullable: true })
  fechaApe!: Date | null;

  /** Fecha de apertura tal cual la entregó Cepheus (respaldo del original). */
  @Column({ type: 'varchar', nullable: true })
  fechaApeRaw!: string | null;

  @Column({ type: 'varchar', nullable: true })
  horaIni!: string | null;

  @Column({ type: 'varchar', nullable: true })
  horaLiq!: string | null;

  /** Orden cruda completa (todas las columnas de Cepheus). */
  @Column('jsonb')
  raw!: Record<string, unknown>;

  @Column({ default: 'cepheus' })
  source!: string;

  @Column({ type: 'timestamptz' })
  ingestedAt!: Date;
}
