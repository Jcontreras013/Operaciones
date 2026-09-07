import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { LocationKind } from '../warehouse.enums';

export class CreateLocationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  code!: string;

  @IsEnum(LocationKind)
  @IsOptional()
  kind?: LocationKind;
}
