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
  source: string;
}

export interface CreateManualWorkOrderInput {
  numOrden: string;
  actividad: string;
  tecnico: string;
  fecha: string;
  horaInicio: string;
  horaLiq?: string;
}

export interface TechnicianLunch {
  id: string;
  tecnico: string;
  fecha: string;
  horaInicioAt: string;
  horaFinAt: string;
}

export interface RegistrarAlmuerzoInput {
  tecnico: string;
  fecha: string;
  horaInicio: string;
  horaFin: string;
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
  byMotivo: FieldGroup[];
  byTecnico: FieldGroup[];
  lastIngest: { ranAt: string; fetched: number; status: string } | null;
}

export interface IngestResult {
  fetched: number;
  created: number;
  updated: number;
  runId: string;
}

// --- Calidad (encuesta de control post-servicio) ---

export type ContactResult =
  | 'contestada'
  | 'cliente_no_desea_participar'
  | 'responsable_no_disponible'
  | 'llamada_reprogramada'
  | 'numero_equivocado'
  | 'sin_respuesta_dos_intentos';

export type AprobacionInterna = 'aprobado' | 'con_observaciones' | 'no_aprobado';

export interface QualitySurvey {
  id: string;
  workOrderId: string;
  externalNum: string;
  cliente: string | null;
  tecnico: string | null;
  actividad: string | null;
  contactResult: ContactResult;
  p1Puntualidad: number | null;
  p2PresentacionTrato: number | null;
  p3ClaridadExplicacion: number | null;
  p4NoAplica: boolean;
  p4TvCcveo: number | null;
  p5CalidadServicio: number | null;
  p6Limpieza: number | null;
  p7Satisfaccion: number | null;
  comentarioMejora: string | null;
  aprobacionInterna: AprobacionInterna | null;
  firmante: string | null;
  requiereSeguimiento: boolean;
  seguimientoTicket: string | null;
  seguimientoResponsable: string | null;
  seguimientoFechaLimite: string | null;
  seguimientoResuelto: boolean;
  createdAt: string;
}

export interface CreateQualitySurveyInput {
  workOrderId: string;
  contactResult: ContactResult;
  p1Puntualidad?: number;
  p2PresentacionTrato?: number;
  p3ClaridadExplicacion?: number;
  p4NoAplica?: boolean;
  p4TvCcveo?: number;
  p5CalidadServicio?: number;
  p6Limpieza?: number;
  p7Satisfaccion?: number;
  comentarioMejora?: string;
  aprobacionInterna?: AprobacionInterna;
  firmante?: string;
  requiereSeguimiento?: boolean;
  seguimientoTicket?: string;
  seguimientoResponsable?: string;
  seguimientoFechaLimite?: string;
}

export interface QualityDiagnosticoItem {
  campo: string;
  etiqueta: string;
  promedio: number | null;
  respuestas: number;
}

export interface QualityReport {
  desde: string;
  totalGestiones: number;
  porResultado: FieldGroup[];
  totalRespuestasValidas: number;
  csat: number | null;
  diagnostico: QualityDiagnosticoItem[];
  seguimientosPendientes: QualitySurvey[];
}

// --- Gantt por técnico ---

export interface GanttRow {
  tecnico: string;
  externalNum: string;
  cliente: string | null;
  actividad: string | null;
  estado: string | null;
  inicio: string;
  fin: string;
}

// --- Centro de Reportes ---

export type CategoriaRetraso = '>= 7 Dia' | '= 4 a 6 Dias' | '= 1 a 3 Dias' | '= 0 Dia';

export interface ResumenRetrasoItem {
  categoria: CategoriaRetraso;
  cantidad: number;
}

export interface ConteoEtiqueta {
  etiqueta: string;
  cantidad: number;
}

export interface TableroDeCarga {
  resumenRetraso: ResumenRetrasoItem[];
  sop: ConteoEtiqueta[];
  excedenDosHoras: number;
  instalaciones: ConteoEtiqueta[];
  plex: ConteoEtiqueta[];
}

export interface SegmentoStats {
  totalGlobal: number;
  cerradasGlobal: number;
  pctGlobal: number;
  totalMora: number;
  cerradasMora: number;
  pctMora: number;
  totalHoy: number;
  cerradasHoy: number;
  pctHoy: number;
}

export interface ReportesBoard {
  kpis: {
    pendientesAsignadas: number;
    cerradasHoy: number;
    tecnicosEnRuta: number;
    caidasOffline: number;
    totalGeneral: number;
  };
  tablero: TableroDeCarga;
  segmentos: {
    residencial: SegmentoStats;
    plex: SegmentoStats;
    global: SegmentoStats;
  };
}

// --- Personal (repositorio de documentos / Expedientes) ---

export interface PersonnelDocument {
  id: string;
  colaborador: string;
  nombreArchivo: string;
  contentType: string | null;
  tamanoBytes: number;
  descripcion: string | null;
  subidoPor: string;
  createdAt: string;
}
