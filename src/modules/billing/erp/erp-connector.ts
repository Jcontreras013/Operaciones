/**
 * Puerto del conector ERP (US3.5).
 *
 * El servicio de facturación depende de esta interfaz, no de un ERP concreto.
 * La Fase 0 provee un StubErpConnector; en producción se enchufa un adaptador
 * real (SAP, Oracle, etc.) sin tocar el resto del sistema.
 */

/** Documento canónico de factura que se envía al ERP (independiente del ERP). */
export interface ErpInvoicePayload {
  tenantId: string;
  invoiceNumber: string;
  clientId: string;
  currency: string;
  totalMinor: string;
  issuedAt: string | null;
  lines: {
    description: string;
    quantity: number;
    rateMinor: string;
    amountMinor: string;
  }[];
}

/** Resultado de una exportación exitosa: la referencia del documento en el ERP. */
export interface ErpExportResult {
  externalRef: string;
}

export interface ErpConnector {
  /** Exporta la factura al ERP. Lanza si la exportación falla. */
  export(payload: ErpInvoicePayload): Promise<ErpExportResult>;
}

/** Token de inyección del conector ERP. */
export const ERP_CONNECTOR = Symbol('ERP_CONNECTOR');
