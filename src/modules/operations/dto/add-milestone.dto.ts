import { IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { OperationStatus } from '../entities/operation.entity';

export class AddMilestoneDto {
  @IsEnum(OperationStatus)
  status!: OperationStatus;

  /** Momento del hito. Si se omite, se usa la hora del servidor. */
  @IsISO8601()
  @IsOptional()
  occurredAt?: string;

  @IsUUID()
  @IsOptional()
  recordedBy?: string;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  note?: string;
}
