/**
 * Puerto del conector con la API Cepheus (fuente de órdenes de campo del
 * monitor). El servicio de ingesta depende de esta interfaz, no de la API
 * concreta: la Fase A usa un StubCepheusConnector; el adaptador real
 * (HTTP Basic Auth contra Cepheus) se enchufa cambiando solo el proveedor,
 * con las credenciales como variables de entorno (nunca en el repo).
 *
 * Cepheus devuelve `{ codigo, ordenes: [...], mensaje }`; cada orden es un
 * objeto con claves en MAYÚSCULAS (NUM, TECNICO, ACTIVIDAD, ESTADO, …).
 */
export type RawOrder = Record<string, unknown>;

export interface CepheusConnector {
  /** Descarga las órdenes con fecha de apertura desde `dateFrom`. */
  fetchOrders(dateFrom: Date): Promise<RawOrder[]>;
}

export const CEPHEUS_CONNECTOR = Symbol('CEPHEUS_CONNECTOR');
