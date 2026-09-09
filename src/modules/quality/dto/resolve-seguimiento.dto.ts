import { IsBoolean } from 'class-validator';

/** Marca un seguimiento pendiente como resuelto (o lo reabre). */
export class ResolveSeguimientoDto {
  @IsBoolean()
  resuelto!: boolean;
}
