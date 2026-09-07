import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class CarrierInvoiceLineDto {
  @IsUUID()
  operationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(160)
  concept!: string;

  /** Monto que el carrier cobra por esta operación, en la menor unidad. */
  @IsInt()
  @Min(0)
  declaredMinor!: number;
}

export class RegisterCarrierInvoiceDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  supplier!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  number!: string;

  @IsString()
  @Length(3, 3)
  @IsOptional()
  currency?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CarrierInvoiceLineDto)
  lines!: CarrierInvoiceLineDto[];
}
