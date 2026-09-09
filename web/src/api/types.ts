// Tipos compartidos con la API (subconjunto usado por la consola).

export interface LoginResponse {
  accessToken: string;
  tokenType: 'Bearer';
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
}

export interface Client {
  id: string;
  name: string;
  code: string | null;
  contactEmail: string | null;
  contactName: string | null;
  active: boolean;
  createdAt: string;
}

export type OperationStatus =
  | 'created'
  | 'in_transit'
  | 'in_warehouse'
  | 'delivered'
  | 'closed';

export interface Operation {
  id: string;
  clientId: string;
  reference: string;
  serviceType: string;
  status: OperationStatus;
  origin: string | null;
  destination: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Milestone {
  id: string;
  status: OperationStatus;
  occurredAt: string;
  note: string | null;
}

export interface Board {
  byStatus: Record<string, number>;
  total: number;
  operations: Operation[];
}

export interface ExceptionRow {
  type: 'stale' | 'missing_pod';
  operationId: string;
  reference: string;
  clientId: string;
  status: OperationStatus;
  detail: string;
}

// --- Campo / Monitor (órdenes telecom) ---

export interface WorkOrder {
  id: string;
  externalNum: string;
  cliente: string | null;
  tecnico: string | null;
  actividad: string | null;
  estado: string | null;
  olt: string | null;
  pon: string | null;
  colonia: string | null;
  causa: string | null;
  comentario: string | null;
  fechaApe: string | null;
  fechaApeRaw: string | null;
  esOffline: boolean;
  alertaTiempo: boolean;
  causaOffline: string | null;
}

export interface OltPonRow {
  olt: string;
  pon: string;
  total: number;
  offline: number;
}

export interface OfflineBoard {
  totalOffline: number;
  totalAlertaTiempo: number;
  porCausa: FieldGroup[];
  porOlt: OltPonRow[];
  porPon: OltPonRow[];
  ordenes: WorkOrder[];
}

export interface FieldGroup {
  key: string;
  count: number;
}

export interface FieldBoard {
  total: number;
  byEstado: FieldGroup[];
  byActividad: FieldGroup[];
  byTecnico: FieldGroup[];
  lastIngest: { ranAt: string; fetched: number; status: string } | null;
}

export interface IngestResult {
  fetched: number;
  created: number;
  updated: number;
  runId: string;
}
