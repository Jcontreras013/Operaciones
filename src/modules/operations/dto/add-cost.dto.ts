import { IsInt, IsOptional, IsString, Length, MaxLength, Min, MinLength } from 'class-validator';

export class AddCostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  concept!: string;

  /** Monto en la menor unidad de la moneda (ej. centavos). */
  @IsInt()
  @Min(0)
  amountMinor!: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  supplier?: string;
}
