import { IsEnum, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { ServiceType } from '../entities/operation.entity';

export class CreateOperationDto {
  @IsUUID()
  clientId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  reference!: string;

  @IsEnum(ServiceType)
  @IsOptional()
  serviceType?: ServiceType;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  origin?: string;

  @IsString()
  @IsOptional()
  @MaxLength(160)
  destination?: string;
}
