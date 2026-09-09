import { Column, Entity, Unique } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * "Registrar Almuerzo" del monitor: la ventana de almuerzo de un técnico en
 * un día, para que el Gantt la muestre como un bloque aparte y no se
 * confunda con tiempo muerto o una visita sin registrar. Un técnico tiene
 * como mucho un almuerzo por día (guardarlo de nuevo lo reemplaza).
 */
@Entity('technician_lunches')
@Unique(['tenantId', 'tecnico', 'fecha'])
export class TechnicianLunch extends TenantOwnedEntity {
  @Column()
  tecnico!: string;

  /** Día calendario de Honduras, 'YYYY-MM-DD'. */
  @Column({ type: 'date' })
  fecha!: string;

  @Column({ type: 'timestamptz' })
  horaInicioAt!: Date;

  @Column({ type: 'timestamptz' })
  horaFinAt!: Date;

  @Column({ type: 'varchar', nullable: true })
  registradoPor!: string | null;
}
