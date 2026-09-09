/**
 * Centro de Reportes: KPIs operativos del día, tablero de carga (retraso +
 * SOP/Instalaciones/Plex) y consolidado por segmento (mora vs. al día).
 * Portado de app.py (`nav_menu_diamante == "📊 Centro de Reportes"`) y de
 * `clasificador.py` (fuente única de verdad para SOP/INS/PLEX — antes ese
 * criterio estaba copiado a mano en ~12 lugares y se desincronizaba).
 */

/**
 * Única fuente de verdad sobre qué actividades son visitas técnicas reales
 * (Gantt, reportes, pendientes, KPIs). Cualquier actividad fuera de esta
 * lista se descarta desde la raíz — para agregar/quitar una, se edita solo
 * esta lista.
 */
export const ACTIVIDADES_PERMITIDAS = [
  'CEQUI', 'INSEQUIPO', 'INSFIBRA', 'INSFIBRACORP', 'INSHFC', 'INS-WA',
  'PEXTERNO', 'PLEXISCA', 'SOP', 'SOPCORP', 'SOPFIBRA', 'SOPFIBRACORP',
  'SOPRECONCORP', 'SOPRECONFIBRA', 'SOPRECONHFC', 'SPLITTEROPT',
  'TRASLADOEXTFIBRA', 'TRASLADOEXTFIBRACORP', 'TRASLADOINTERNOFIBRA',
  'TRASLADOINTFIBRACORP', 'TVADICIONAL',
];

/** Estados "vivos": la orden sigue en curso (no es un estado terminal). */
const RE_ASIGNADAS_VIVA =
  /PENDIENTE|INICIADA|PROCESO|ASIGNADA|DESPACHO|RUTA|SITIO|VIAJANDO|CAMINO|LLEGADA|ABIERTA|EJECUCION|ATENDIENDO|TRABAJANDO/;

const TECNICOS_INVALIDOS = new Set(['', 'NONE', 'NAN', 'N/D', 'NULL', '0']);
const TECNICO_EXCLUIDO_RETRASO = 'JOSUE MIGUEL SAUCEDA';

function norm(texto: string | null | undefined): string {
  if (texto == null) return '';
  const s = String(texto).trim();
  return s.toLowerCase() === 'nan' ? '' : s.toUpperCase();
}

/** ¿Esta orden tiene un técnico asignado válido (no vacío/N-D)? */
export function tieneTecnicoValido(tecnico: string | null): boolean {
  return !TECNICOS_INVALIDOS.has(norm(tecnico));
}

/** ¿El estado indica que la orden sigue viva (no es una foto de cierre)? */
export function esEstadoVivo(estado: string | null): boolean {
  return RE_ASIGNADAS_VIVA.test(norm(estado));
}

/** ¿Esta orden entra al universo de "pendientes" del Monitor? */
export function esPendienteMonitor(order: { estado: string | null; tecnico: string | null; actividad: string | null }): boolean {
  if (!esEstadoVivo(order.estado)) return false;
  if (tieneTecnicoValido(order.tecnico)) return true;
  return ACTIVIDADES_PERMITIDAS.includes(norm(order.actividad));
}

/** ¿Esta orden no tiene técnico asignado, siendo de una actividad que sí debería tenerlo? */
export function esNoAsignadaValida(actividad: string | null, tecnico: string | null): boolean {
  return !tieneTecnicoValido(tecnico) && ACTIVIDADES_PERMITIDAS.includes(norm(actividad));
}

/**
 * "Ver solo Críticas" del Monitor: soportes de fibra (SOP) offline o con
 * alerta de tiempo, excluyendo instalaciones/Plex — un PEXTERNO o INSFIBRA
 * cuya actividad mencione "SOP" de pasada no debe colarse aquí.
 */
const RE_FALSOS_CRITICA = /PLEXISCA|PEXTERNO|SPLITTEROPT|PLEX|INS|NUEVA|ADIC|CAMBIO|RECU|TVADICIONAL|MIGRACI/;

export function esCritica(actividad: string | null, esOffline: boolean, alertaTiempo: boolean): boolean {
  if (!esOffline && !alertaTiempo) return false;
  const act = norm(actividad);
  if (!/SOP/.test(act)) return false;
  return !RE_FALSOS_CRITICA.test(act);
}

/** Días de retraso desde FECHA_APE (0 para el técnico excluido, nunca negativo). */
export function diasRetraso(fechaApe: Date | null, tecnico: string | null, ahora: Date = new Date()): number {
  if (norm(tecnico) === TECNICO_EXCLUIDO_RETRASO) return 0;
  if (!fechaApe) return 0;
  const inicioHoy = new Date(ahora);
  inicioHoy.setHours(0, 0, 0, 0);
  const inicioApe = new Date(fechaApe);
  inicioApe.setHours(0, 0, 0, 0);
  const dias = Math.round((inicioHoy.getTime() - inicioApe.getTime()) / 86_400_000);
  return Math.max(0, dias);
}

export type CategoriaRetraso = '>= 7 Dia' | '= 4 a 6 Dias' | '= 1 a 3 Dias' | '= 0 Dia';

export function categoriaRetraso(dias: number): CategoriaRetraso {
  if (dias >= 7) return '>= 7 Dia';
  if (dias >= 4) return '= 4 a 6 Dias';
  if (dias >= 1) return '= 1 a 3 Dias';
  return '= 0 Dia';
}

// ---------------------------------------------------------------------------
// Clasificador SOP / Instalaciones / Plex (clasificador.py)
// ---------------------------------------------------------------------------

const RE_PLEX = /PEXTERNO|SPLITTEROPT|PLEXISCA/;
const RE_SOP = /SOP|FALLA|MANT/;
const RE_INSTALACION = /INS|NUEVA|ADIC|CAMBIO|MIGRACI|RECUP/;
const RE_SOP_O_INSTALACION = /SOP|FALLA|MANT|INS|NUEVA|ADIC|CAMBIO|MIGRACI|RECUP/;

export type GrupoTablero = 'OTROS' | 'INS' | 'SOP';

export function esPlex(actividad: string | null): boolean {
  return RE_PLEX.test(norm(actividad));
}

export function esSop(actividad: string | null): boolean {
  return RE_SOP.test(norm(actividad));
}

export function esInstalacion(texto: string | null): boolean {
  return RE_INSTALACION.test(norm(texto));
}

export function subtipoInstalacion(texto: string | null): string {
  const t = norm(texto);
  if (/ADIC/.test(t)) return 'Adición';
  if (/CAMBIO|MIGRACI/.test(t)) return 'Cambio / Migración';
  if (/RECUP/.test(t)) return 'Recuperado';
  return 'Nueva';
}

export function subtipoSop(actividad: string | null, comentario: string | null, esOffline = false): string {
  const act = norm(actividad);
  const com = norm(comentario);
  if (esOffline) return 'ONT/ONU Offline';
  if (/NIVEL|DB/.test(com)) return 'Niveles alterados';
  if (/FIBRA|FTTH/.test(act)) return 'FTTH / FIBRA';
  if (/NAV|INTERNET/.test(act)) return 'Navegación / Internet';
  if (/TV|CABLE/.test(act)) return 'Sin señal de TV';
  return 'SOP General';
}

/**
 * Clasifica una orden pendiente en (grupo, subtipo) para el tablero de carga.
 *
 * El orden de evaluación es deliberado y no debe alterarse:
 *   1. PLEX primero, por ACTIVIDAD -> 'OTROS' (un PEXTERNO cuyo comentario
 *      mencione "instalación" o "falla" no se fuga a INS/SOP).
 *   2. Si ni actividad ni comentario mencionan SOP/INS -> 'OTROS'.
 *   3. Si el texto indica instalación y la actividad no es SOP -> 'INS'.
 *   4. En cualquier otro caso -> 'SOP'.
 */
/** Honduras es UTC-6 todo el año. Mismo criterio que field-ingest.service.ts. */
const HN_OFFSET_MS = 6 * 60 * 60 * 1000;

function fechaHN(instante: Date): { y: number; m: number; d: number } {
  const shifted = new Date(instante.getTime() - HN_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate() };
}

/** ¿`a` cae en el mismo día calendario de Honduras que `b`? */
export function esMismoDiaHonduras(a: Date, b: Date): boolean {
  const fa = fechaHN(a);
  const fb = fechaHN(b);
  return fa.y === fb.y && fa.m === fb.m && fa.d === fb.d;
}

/** ¿`a` cae en un día calendario de Honduras anterior a `hoy`? */
export function esAntesDeHoyHonduras(a: Date, hoy: Date): boolean {
  const fa = fechaHN(a);
  const fh = fechaHN(hoy);
  if (fa.y !== fh.y) return fa.y < fh.y;
  if (fa.m !== fh.m) return fa.m < fh.m;
  return fa.d < fh.d;
}

export function clasificarTablero(
  actividad: string | null,
  comentario: string | null,
  esOffline = false,
): { grupo: GrupoTablero; subtipo: string } {
  const act = norm(actividad);
  const com = norm(comentario);
  const txt = `${act} ${com}`;

  if (RE_PLEX.test(act)) return { grupo: 'OTROS', subtipo: act || 'N/A' };
  if (!RE_SOP_O_INSTALACION.test(txt)) return { grupo: 'OTROS', subtipo: act || 'N/A' };
  if (RE_INSTALACION.test(txt) && !RE_SOP.test(act)) return { grupo: 'INS', subtipo: subtipoInstalacion(txt) };
  return { grupo: 'SOP', subtipo: subtipoSop(act, com, esOffline) };
}
