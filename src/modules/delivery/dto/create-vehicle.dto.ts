import { IsInt, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateVehicleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  capacity?: number;
}
