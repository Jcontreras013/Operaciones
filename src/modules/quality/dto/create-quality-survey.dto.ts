import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  ValidateIf,
} from 'class-validator';
import { AprobacionInterna, ContactResult } from '../entities/quality-survey.entity';

/**
 * Registra la gestión de llamada post-servicio de una orden. Si
 * `contactResult` es CONTESTADA, se exige la encuesta completa (P1-P7,
 * aprobación interna); para cualquier otro resultado esos campos se ignoran
 * (el servicio los deja en null). `requiereSeguimiento` es independiente del
 * resultado de la llamada: aplica a cualquier caso que necesite un
 * seguimiento posterior.
 */
export class CreateQualitySurveyDto {
  @IsUUID()
  workOrderId!: string;

  @IsEnum(ContactResult)
  contactResult!: ContactResult;

  @ValidateIf((o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA)
  @IsInt()
  @Min(1)
  @Max(5)
  p1Puntualidad?: number;

  @ValidateIf((o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA)
  @IsInt()
  @Min(1)
  @Max(5)
  p2PresentacionTrato?: number;

  @ValidateIf((o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA)
  @IsInt()
  @Min(1)
  @Max(5)
  p3ClaridadExplicacion?: number;

  /** El cliente no tiene TV Cable/CCVEO: si es true, p4TvCcveo no se exige. */
  @IsOptional()
  @IsBoolean()
  p4NoAplica?: boolean;

  @ValidateIf(
    (o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA && !o.p4NoAplica,
  )
  @IsInt()
  @Min(1)
  @Max(5)
  p4TvCcveo?: number;

  @ValidateIf((o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA)
  @IsInt()
  @Min(1)
  @Max(5)
  p5CalidadServicio?: number;

  @ValidateIf((o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA)
  @IsInt()
  @Min(1)
  @Max(5)
  p6Limpieza?: number;

  /** Pregunta 7 — indicador oficial de CSAT. */
  @ValidateIf((o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA)
  @IsInt()
  @Min(1)
  @Max(5)
  p7Satisfaccion?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  comentarioMejora?: string;

  @ValidateIf((o: CreateQualitySurveyDto) => o.contactResult === ContactResult.CONTESTADA)
  @IsEnum(AprobacionInterna)
  aprobacionInterna?: AprobacionInterna;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  firmante?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  horaCierre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  fechaVisita?: string;

  // --- Seguimiento ---

  @IsOptional()
  @IsBoolean()
  requiereSeguimiento?: boolean;

  @ValidateIf((o: CreateQualitySurveyDto) => o.requiereSeguimiento === true)
  @IsString()
  @MaxLength(60)
  seguimientoTicket?: string;

  @ValidateIf((o: CreateQualitySurveyDto) => o.requiereSeguimiento === true)
  @IsString()
  @MaxLength(120)
  seguimientoResponsable?: string;

  @ValidateIf((o: CreateQualitySurveyDto) => o.requiereSeguimiento === true)
  @IsDateString()
  seguimientoFechaLimite?: string;
}
