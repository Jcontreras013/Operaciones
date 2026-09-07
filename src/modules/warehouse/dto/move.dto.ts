import { IsInt, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';

/** Traslado de mercancía entre ubicaciones (putaway / transferencia). */
export class MoveDto {
  @IsUUID()
  clientId!: string;

  @IsUUID()
  fromLocationId!: string;

  @IsUUID()
  toLocationId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  sku!: string;

  @IsInt()
  @Min(1)
  quantity!: number;
}
