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
