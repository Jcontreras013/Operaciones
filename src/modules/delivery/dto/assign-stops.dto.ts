import { ArrayMinSize, IsArray, IsUUID } from 'class-validator';

/** Asigna entregas del pool a una ruta. */
export class AssignStopsDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  deliveryIds!: string[];
}
