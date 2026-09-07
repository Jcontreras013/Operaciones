import { IsString, MaxLength, MinLength } from 'class-validator';

/** Marca una entrega como fallida con su motivo. */
export class FailDeliveryDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  reason!: string;
}
