import {
  IsEnum,
  IsISO8601,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { AssignmentType } from '../delivery.enums';

/**
 * Crea una ruta para una fecha. Según assignmentType:
 *  - own: requiere vehicleId (driverName opcional).
 *  - carrier: requiere carrierId.
 * La validación cruzada se hace en el servicio.
 */
export class CreateRouteDto {
  @IsISO8601()
  date!: string;

  @IsEnum(AssignmentType)
  assignmentType!: AssignmentType;

  @IsUUID()
  @IsOptional()
  vehicleId?: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  driverName?: string;

  @IsUUID()
  @IsOptional()
  carrierId?: string;

  @IsLatitude()
  @IsOptional()
  originLat?: number;

  @IsLongitude()
  @IsOptional()
  originLng?: number;
}
