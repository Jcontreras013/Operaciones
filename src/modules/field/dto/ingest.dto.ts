import { IsISO8601, IsOptional } from 'class-validator';

/** Dispara una ingesta desde Cepheus. Sin fecha, usa una ventana por defecto. */
export class IngestDto {
  /** Fecha de apertura desde la cual traer órdenes (ISO). Default: hace 7 días. */
  @IsISO8601()
  @IsOptional()
  from?: string;
}
