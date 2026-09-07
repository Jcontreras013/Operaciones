import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/** Salida (pick) de mercancía de un cliente desde una ubicación. */
export class PickDto {
  @IsUUID()
  clientId!: string;

  @IsUUID()
  locationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  sku!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsString()
  @IsOptional()
  @MaxLength(80)
  reference?: string;
}
