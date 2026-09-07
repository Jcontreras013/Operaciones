import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Prueba de entrega (POD) al cerrar una entrega. */
export class CompleteDeliveryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  receivedBy!: string;

  @IsString()
  @IsOptional()
  @MaxLength(1024)
  podPhotoKey?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  podNote?: string;
}
