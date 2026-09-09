/**
 * Detección de "offline" (equipos de red caídos) y clasificación de su causa
 * raíz. Portado 1:1 de la lógica de negocio de monitor-operativo (tools.py:
 * `calcular_offline_y_alertas`, `es_offline_preciso`, `clasificar_causa_offline`)
 * para que el número de offline y sus causas coincidan con los que ya
 * conocen operaciones/soporte — cambiar el orden o las palabras clave aquí
 * cambia esos conteos.
 */

/** Actividades de tipo soporte/reparación de fibra (universo elegible a offline). */
const RE_SOP = /SOPFIBRA/;

/**
 * Actividades que, aunque contengan texto parecido, NO son una falla de red:
 * instalaciones, cambios, migraciones, etc. Se excluyen para no inflar el
 * conteo de offline con trabajo que no es una avería.
 */
const RE_FALSOS = /PLEXISCA|PEXTERNO|SPLITTEROPT|PLEX|INS|NUEVA|ADIC|CAMBIO|RECU|TVADICIONAL|MIGRACI/;

const RE_COMENTARIO_OFFLINE = /ONU OFFLINE|OFF LINE|OFFLINE|LOS EN ROJO|PON ROJO/;

/** Técnico excluido del cálculo (regla histórica del monitor original). */
const TECNICO_EXCLUIDO = 'JOSUE MIGUEL SAUCEDA';

const JERGA_SOLUCION = ['OK', 'LISTO', 'RECUPERADO', 'SOLUCIONADO', 'NAVEGA', 'YA QUEDO', 'ARRIBA', 'FUNCIONAL', 'ONLINE'];
const KEYWORDS_FALLA = ['OFFLINE', 'OFF LINE', 'LOS RED', 'PON ROJO', 'LOS EN ROJO', 'EQUIPO OFFLINE', 'ONU OFFLINE', 'ONT OFFLINE'];

/** ¿El comentario describe puntualmente un equipo caído (y no ya resuelto)? */
export function esOfflinePreciso(comentario: string | null): boolean {
  const txt = (comentario ?? '').toUpperCase().trim();
  if (!txt) return false;
  if (JERGA_SOLUCION.some((w) => txt.includes(w))) return false;
  return KEYWORDS_FALLA.some((w) => txt.includes(w));
}

export interface OfflineFlags {
  esOffline: boolean;
  alertaTiempo: boolean;
}

/**
 * Calcula ES_OFFLINE y ALERTA_TIEMPO para una orden. `horaIniAt`/`horaLiqAt`
 * son las horas de inicio/liquidación ya combinadas con su fecha (Date), no
 * los strings crudos de Cepheus.
 */
export function computeOfflineFlags(order: {
  actividad: string | null;
  estado: string | null;
  tecnico: string | null;
  comentario: string | null;
  horaIniAt: Date | null;
  horaLiqAt: Date | null;
}, now: Date = new Date()): OfflineFlags {
  const actividad = (order.actividad ?? '').toUpperCase();
  const estado = (order.estado ?? '').toUpperCase().trim();
  const tecnico = (order.tecnico ?? '').toUpperCase().trim();

  const esSop = RE_SOP.test(actividad);
  const esFalso = RE_FALSOS.test(actividad);
  const abierta = estado !== 'CERRADA';
  const tecnicoValido = tecnico !== TECNICO_EXCLUIDO;

  const minutosDesdeInicio =
    order.horaIniAt != null ? (now.getTime() - order.horaIniAt.getTime()) / 60000 : null;

  const alertaTiempo =
    order.horaIniAt != null &&
    order.horaLiqAt == null &&
    minutosDesdeInicio != null &&
    minutosDesdeInicio > 120 &&
    abierta &&
    esSop &&
    !esFalso;

  const comentarioIndicaFalla =
    RE_COMENTARIO_OFFLINE.test((order.comentario ?? '').toUpperCase()) || esOfflinePreciso(order.comentario);

  const esOffline = tecnicoValido && abierta && esSop && !esFalso && comentarioIndicaFalla;

  return { esOffline, alertaTiempo };
}

/** Estados que consideramos "trabajo hecho" (además del literal 'CERRADA'). */
const ESTADOS_TRABAJO_HECHO = ['CERRADA', 'LIQUIDADA', 'FINALIZADA'];

const TECNICOS_INVALIDOS = new Set(['', 'NONE', 'NAN', 'N/D', 'NULL', '0']);

/**
 * ¿Esta orden entra al universo del diagnóstico de causa raíz? Ese universo
 * es distinto al de ES_OFFLINE: aquí SÍ exigimos que ya esté cerrada (la
 * causa real solo se conoce al cierre) y que tenga técnico asignado (una
 * orden que nadie ha trabajado no es un caso sin documentar, es un caso sin
 * atender). Deliberadamente no exige `esOffline` — el diagnóstico también
 * cuenta los falsos positivos ("estaba en línea") entre los soportes de
 * fibra ya cerrados.
 */
export function esUniversoDiagnostico(order: {
  actividad: string | null;
  estado: string | null;
  tecnico: string | null;
}): boolean {
  const actividad = (order.actividad ?? '').toUpperCase();
  const estado = (order.estado ?? '').toUpperCase().trim();
  const tecnico = (order.tecnico ?? '').toUpperCase().trim();

  const esSop = RE_SOP.test(actividad);
  const esFalso = RE_FALSOS.test(actividad);
  const cerrada = ESTADOS_TRABAJO_HECHO.includes(estado);
  const tieneTecnico = !TECNICOS_INVALIDOS.has(tecnico);

  return esSop && !esFalso && cerrada && tieneTecnico;
}

/**
 * Causas raíz de offline, en orden de prioridad: gana la primera que
 * coincide, de lo más específico/excluyente a lo más genérico. Reordenar
 * esta lista cambia los conteos del diagnóstico.
 */
export const CAUSAS_OFFLINE: [string, string[]][] = [
  ['✅ Falso positivo (estaba en línea)', [
    'ESTABA ONLINE', 'ESTABA EN LINEA', 'YA ESTABA ARRIBA', 'YA ESTABA NAVEGANDO',
    'SIN FALLA', 'NO HAY FALLA', 'NO SE ENCONTRO FALLA', 'NO PRESENTA FALLA',
    'NAVEGANDO BIEN', 'TODO BIEN', 'TODO OK', 'SIN NOVEDAD', 'FALSA ALARMA',
    'NO REPORTA FALLA', 'CLIENTE NO REPORTA',
  ]],
  ['💰 Corte administrativo / mora', [
    'MORA', 'CORTE ADMINISTRATIVO', 'FALTA DE PAGO', 'SUSPENDIDO POR PAGO',
    'CORTE POR MORA', 'SUSPENSION', 'SUSPENDIDO', 'NO HA PAGADO', 'PENDIENTE DE PAGO',
  ]],
  ['🌪️ Daño externo / corte de fibra', [
    'RECO', 'PODA', 'PODARON', 'POSTE', 'CAMBIO DE POSTE', 'OBRA', 'EXCAVACION',
    'ACCIDENTE', 'CHOQUE', 'CARRO', 'VANDALISMO', 'ROBO DE CABLE', 'ROBARON',
    'FIBRA CORTADA', 'CORTARON LA FIBRA', 'CABLE CORTADO', 'ARBOL', 'RAMA',
    'INCENDIO', 'DERRUMBE',
  ]],
  ['🔁 Instalación deficiente / retrabajo', [
    'MALA INSTALACION', 'MAL EMPALME', 'MAL INSTALADO', 'INSTALACION DEFICIENTE',
    'REINSTALACION', 'MAL CONECTORIZADO', 'TRABAJO MAL HECHO',
  ]],
  ['🔌 Energía / sin corriente', [
    'SIN ENERGIA', 'SIN LUZ', 'SIN CORRIENTE', 'APAGON', 'BREAKER', 'BATERIA',
    'UPS', 'NO TIENE CORRIENTE', 'FALLA ELECTRICA', 'ENEE', 'TOMACORRIENTE',
    'TOMA DE CORRIENTE', 'REGULADOR',
  ]],
  ['⚡ Equipo del cliente (ONU/ONT)', [
    'ONU DANADA', 'ONT DANADA', 'ONU QUEMADA', 'ONT QUEMADA', 'EQUIPO QUEMADO',
    'RAYO', 'DESCARGA', 'CAMBIO DE ONU', 'CAMBIO DE ONT', 'CAMBIO DE EQUIPO',
    'EQUIPO DESCONECTADO', 'CLIENTE DESCONECTO', 'DESCONECTO EL EQUIPO',
    'FUENTE DANADA', 'ADAPTADOR', 'EQUIPO DANADO', 'QUEMADA', 'QUEMADO',
  ]],
  ['🛰️ Falla de red / OLT', [
    'OLT', 'TARJETA', 'PUERTO PON', 'PON DANADO', 'SPLITTER', 'NODO',
    'CAIDA MASIVA', 'MASIVO', 'TODA LA ZONA', 'VARIOS CLIENTES',
  ]],
  ['🔬 Nivel óptico / atenuación', [
    'ATENUACION', 'ATENUADO', 'NIVEL BAJO', 'NIVELES', 'RXPOWER', 'POTENCIA',
    'CONECTOR SUCIO', 'LIMPIEZA DE CONECTOR', 'LIMPIEZA DE FIBRA', 'EMPALME',
    'CURVATURA', 'DOBLEZ', 'DOBLADA', 'PATCHCORD', 'PIGTAIL', 'FUSION',
  ]],
  ['🚪 No hubo acceso al cliente', [
    'NO HABIA NADIE', 'CLIENTE AUSENTE', 'NO ATENDIO', 'CASA CERRADA',
    'NO CONTESTA', 'NO PERMITIO', 'PERRO',
  ]],
];

/** Quita acentos y pasa a mayúsculas, para comparar contra las claves de arriba. */
function normalizar(texto: string): string {
  return texto
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export interface CausaOffline {
  causa: string;
  evidencia: string;
}

/**
 * Traduce el cierre del técnico (razón de cierre + comentario de cierre, y
 * como último recurso el comentario de apertura) a una causa raíz comparable.
 */
export function clasificarCausaOffline(
  razonCierre: string | null,
  comentarioCierre: string | null,
  comentarioApertura: string | null = null,
): CausaOffline {
  const partes = [razonCierre, comentarioCierre, comentarioApertura].filter(
    (p): p is string => !!p && !['', 'NAN', 'NONE', 'N/D'].includes(p.toUpperCase().trim()),
  );
  const texto = normalizar(partes.join(' '));

  if (!texto.trim()) {
    return { causa: '❓ Sin comentario de cierre', evidencia: '' };
  }

  for (const [causa, claves] of CAUSAS_OFFLINE) {
    const encontradas = claves.filter((k) => texto.includes(k));
    if (encontradas.length > 0) {
      return { causa, evidencia: [...new Set(encontradas)].sort().join(', ') };
    }
  }

  return { causa: '❓ Sin clasificar', evidencia: '' };
}
