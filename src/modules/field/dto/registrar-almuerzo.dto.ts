import { IsDateString, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const HORA_HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/** "Registrar Almuerzo" del monitor: la ventana de almuerzo de un técnico en un día. */
export class RegistrarAlmuerzoDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  tecnico!: string;

  /** Día calendario de Honduras, 'YYYY-MM-DD'. */
  @IsDateString({ strict: true })
  fecha!: string;

  @Matches(HORA_HHMM, { message: 'horaInicio debe tener formato HH:MM' })
  horaInicio!: string;

  @Matches(HORA_HHMM, { message: 'horaFin debe tener formato HH:MM' })
  horaFin!: string;
}
