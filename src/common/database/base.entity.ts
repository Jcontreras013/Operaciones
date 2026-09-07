import {
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Column,
  Index,
} from 'typeorm';

/** Columnas comunes a toda entidad. */
export abstract class BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

/**
 * Entidad que pertenece a un tenant (operador 3PL).
 *
 * `tenantId` es obligatorio e indexado: toda consulta debe filtrar por él.
 * El aislamiento no depende solo de esto — en producción se refuerza con
 * Row-Level Security en PostgreSQL.
 */
export abstract class TenantOwnedEntity extends BaseEntity {
  @Index()
  @Column('uuid')
  tenantId!: string;
}
