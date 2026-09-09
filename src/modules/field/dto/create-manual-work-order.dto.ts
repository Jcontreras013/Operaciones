import { IsDateString, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const HORA_HHMM = /^([01]\d|2[0-3]):([0-5]\d)$/;

/**
 * "Ingresar Orden Manual" del monitor: para cuando la API de Cepheus falla y
 * una orden real de un técnico no se refleja en el sistema. Se identifica
 * por `numOrden` — si ya existe una orden manual con ese número, se
 * reemplaza (no se duplica).
 */
export class CreateManualWorkOrderDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  numOrden!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  actividad!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  tecnico!: string;

  /** Día calendario de Honduras, 'YYYY-MM-DD'. */
  @IsDateString({ strict: true })
  fecha!: string;

  @Matches(HORA_HHMM, { message: 'horaInicio debe tener formato HH:MM' })
  horaInicio!: string;

  @IsOptional()
  @Matches(HORA_HHMM, { message: 'horaLiq debe tener formato HH:MM' })
  horaLiq?: string;
}
