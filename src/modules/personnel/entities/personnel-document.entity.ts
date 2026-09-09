import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * "Repositorio de Documentos" del monitor original: documentos laborales
 * (contratos, identificaciones, etc.) organizados por colaborador.
 *
 * El original los subía a Catbox (enlaces PÚBLICOS — su propio código lo
 * advertía como riesgo de privacidad) con un índice aparte en Google
 * Sheets. Acá el archivo vive en la misma fila, en Postgres: privado por
 * diseño (solo se sirve a través de la API, con autenticación), sin
 * depender de un host externo ni de que la hoja y el archivo no se
 * desincronicen.
 */
@Entity('personnel_documents')
export class PersonnelDocument extends TenantOwnedEntity {
  /** Nombre del colaborador, en mayúsculas (técnico o SAC/administrativo). */
  @Index()
  @Column()
  colaborador!: string;

  @Column()
  nombreArchivo!: string;

  @Column({ type: 'varchar', nullable: true })
  contentType!: string | null;

  @Column({ type: 'int' })
  tamanoBytes!: number;

  @Column({ type: 'varchar', nullable: true })
  descripcion!: string | null;

  /** Contenido del archivo. `select: false`: no se trae en listados, solo al descargar. */
  @Column({ type: 'bytea', select: false })
  contenido!: Buffer;

  /** userId de quien lo subió (ver CurrentUserId). */
  @Column()
  subidoPor!: string;
}
