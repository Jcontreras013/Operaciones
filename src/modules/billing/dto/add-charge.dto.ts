import { IsEnum, IsInt, IsOptional, IsString, Length, MaxLength, Min, MinLength } from 'class-validator';
import { ChargeType } from '../billing.enums';

/**
 * Cargo manual contra una operación (US3.2, para VAS, pick&pack o ajustes).
 * Si se omite `rateMinor`, el motor buscará la regla del tipo indicado en la
 * rate card del cliente.
 */
export class AddChargeDto {
  @IsEnum(ChargeType)
  chargeType!: ChargeType;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  description!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  /** Tarifa unitaria en la menor unidad. Si se omite, se toma de la rate card. */
  @IsInt()
  @Min(0)
  @IsOptional()
  rateMinor?: number;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;
}
