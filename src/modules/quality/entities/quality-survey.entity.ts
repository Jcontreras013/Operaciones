import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Resultado de la gestión de llamada post-servicio. `CONTESTADA` es la única
 * que habilita la encuesta de satisfacción (P1-P7); las demás son motivos de
 * no-contacto que igual quedan registrados para medir efectividad de
 * localización, no solo satisfacción. Se excluye deliberadamente el envío
 * por WhatsApp (WATI): es un servicio de paga que no se está usando.
 */
export enum ContactResult {
  CONTESTADA = 'contestada',
  CLIENTE_NO_DESEA_PARTICIPAR = 'cliente_no_desea_participar',
  RESPONSABLE_NO_DISPONIBLE = 'responsable_no_disponible',
  LLAMADA_REPROGRAMADA = 'llamada_reprogramada',
  NUMERO_EQUIVOCADO = 'numero_equivocado',
  SIN_RESPUESTA_DOS_INTENTOS = 'sin_respuesta_dos_intentos',
}

export enum AprobacionInterna {
  APROBADO = 'aprobado',
  CON_OBSERVACIONES = 'con_observaciones',
  NO_APROBADO = 'no_aprobado',
}

/**
 * Encuesta de control de calidad de una visita técnica, capturada por
 * teléfono tras el cierre de una orden de campo (`WorkOrder`). Reemplaza la
 * pestaña "Registrar Gestión de Llamada" de `ccalidad.py` en monitor-operativo.
 *
 * Datos del cliente/técnico/actividad se copian de la orden al crear (igual
 * que los campos "auto-rellenados" del monitor original), para poder
 * reportar sin hacer join contra `work_orders` en cada consulta.
 *
 * P1-P6 son diagnóstico (qué parte de la instalación mejorar); P7 es el
 * indicador oficial de CSAT. P4 (explicación de TV Cable/CCVEO) admite
 * "No aplica" cuando el cliente no tiene ese servicio.
 */
@Entity('quality_surveys')
export class QualitySurvey extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  workOrderId!: string;

  @Column()
  externalNum!: string;

  @Column({ type: 'varchar', nullable: true })
  cliente!: string | null;

  @Column({ type: 'varchar', nullable: true })
  tecnico!: string | null;

  @Column({ type: 'varchar', nullable: true })
  actividad!: string | null;

  @Index()
  @Column({ type: 'enum', enum: ContactResult })
  contactResult!: ContactResult;

  // --- Encuesta de satisfacción (solo si contactResult = CONTESTADA) ---

  @Column({ type: 'smallint', nullable: true })
  p1Puntualidad!: number | null;

  @Column({ type: 'smallint', nullable: true })
  p2PresentacionTrato!: number | null;

  @Column({ type: 'smallint', nullable: true })
  p3ClaridadExplicacion!: number | null;

  /** El cliente no tiene TV Cable/CCVEO: P4 no aplica y queda en null. */
  @Column({ default: false })
  p4NoAplica!: boolean;

  @Column({ type: 'smallint', nullable: true })
  p4TvCcveo!: number | null;

  @Column({ type: 'smallint', nullable: true })
  p5CalidadServicio!: number | null;

  @Column({ type: 'smallint', nullable: true })
  p6Limpieza!: number | null;

  /** Indicador oficial de CSAT: % de respuestas con 4 o 5 aquí. */
  @Column({ type: 'smallint', nullable: true })
  p7Satisfaccion!: number | null;

  @Column({ type: 'varchar', nullable: true })
  comentarioMejora!: string | null;

  @Column({ type: 'enum', enum: AprobacionInterna, nullable: true })
  aprobacionInterna!: AprobacionInterna | null;

  @Column({ type: 'varchar', nullable: true })
  firmante!: string | null;

  @Column({ type: 'varchar', nullable: true })
  horaCierre!: string | null;

  @Column({ type: 'varchar', nullable: true })
  fechaVisita!: string | null;

  // --- Seguimiento (independiente del resultado de la llamada) ---

  @Index()
  @Column({ default: false })
  requiereSeguimiento!: boolean;

  @Column({ type: 'varchar', nullable: true })
  seguimientoTicket!: string | null;

  @Column({ type: 'varchar', nullable: true })
  seguimientoResponsable!: string | null;

  @Column({ type: 'date', nullable: true })
  seguimientoFechaLimite!: string | null;

  @Column({ default: false })
  seguimientoResuelto!: boolean;

  /** Operador que registró la gestión (JWT del token, si aplica). */
  @Column({ type: 'uuid', nullable: true })
  gestionadoPor!: string | null;
}
