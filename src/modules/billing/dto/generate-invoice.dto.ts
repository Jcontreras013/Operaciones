import { IsISO8601, IsUUID } from 'class-validator';

/** Genera una factura draft con los cargos pendientes del cliente en el período. */
export class GenerateInvoiceDto {
  @IsUUID()
  clientId!: string;

  @IsISO8601()
  periodStart!: string;

  @IsISO8601()
  periodEnd!: string;
}
