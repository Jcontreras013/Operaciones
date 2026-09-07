import { IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/** Recepción de mercancía de un cliente en una ubicación. */
export class ReceiptDto {
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
