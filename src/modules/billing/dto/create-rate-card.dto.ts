import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ChargeType, RateUnit } from '../billing.enums';
import { OperationStatus } from '@modules/operations/entities/operation.entity';

export class RateRuleDto {
  @IsEnum(ChargeType)
  chargeType!: ChargeType;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  description!: string;

  /** Tarifa en la menor unidad de la moneda (ej. centavos). */
  @IsInt()
  @Min(0)
  rateMinor!: number;

  @IsEnum(RateUnit)
  unit!: RateUnit;

  /** Estado que dispara la regla automáticamente (opcional). */
  @IsEnum(OperationStatus)
  @IsOptional()
  triggerStatus?: OperationStatus;
}

export class CreateRateCardDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => RateRuleDto)
  rules!: RateRuleDto[];
}
