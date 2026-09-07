import { randomUUID } from 'node:crypto';
import { Injectable, Logger } from '@nestjs/common';
import { ErpConnector, ErpExportResult, ErpInvoicePayload } from './erp-connector';

/**
 * Conector ERP de la Fase 0: simula la exportación y devuelve una referencia
 * externa. Deja registro en el log del payload canónico enviado. Se reemplaza
 * por un adaptador real (SAP/Oracle/…) sin cambiar el servicio de facturación.
 */
@Injectable()
export class StubErpConnector implements ErpConnector {
  private readonly logger = new Logger(StubErpConnector.name);

  async export(payload: ErpInvoicePayload): Promise<ErpExportResult> {
    const externalRef = `ERP-${randomUUID()}`;
    this.logger.log(
      `Exportando factura ${payload.invoiceNumber} (${payload.lines.length} líneas, ` +
        `total ${payload.totalMinor} ${payload.currency}) -> ${externalRef}`,
    );
    return { externalRef };
  }
}
