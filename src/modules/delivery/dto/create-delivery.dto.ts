import {
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

/** Crea una entrega en el pool (sin ruta todavía). */
export class CreateDeliveryDto {
  @IsUUID()
  clientId!: string;

  @IsUUID()
  @IsOptional()
  operationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  reference!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  address!: string;

  @IsLatitude()
  @IsOptional()
  lat?: number;

  @IsLongitude()
  @IsOptional()
  lng?: number;
}
