import { Injectable, Logger } from '@nestjs/common';
import { CepheusConnector, RawOrder } from './cepheus-connector';

/**
 * Conector Cepheus de la Fase A: devuelve órdenes de ejemplo con la MISMA forma
 * que la API real (claves en mayúsculas), para construir y probar la ingesta
 * sin depender de credenciales. Se reemplaza por el adaptador HTTP real.
 */
/** Formatea a 'dd/mm/aaaa HH:MM', el formato que manda Cepheus para fechas/horas. */
function fmt(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

@Injectable()
export class StubCepheusConnector implements CepheusConnector {
  private readonly logger = new Logger(StubCepheusConnector.name);

  async fetchOrders(dateFrom: Date): Promise<RawOrder[]> {
    const d = dateFrom.toLocaleDateString('es-HN');
    this.logger.log(`Cepheus (stub): devolviendo órdenes de ejemplo desde ${d}`);
    const ahora = new Date();
    const hace3h = new Date(ahora.getTime() - 3 * 60 * 60 * 1000);
    const hace20min = new Date(ahora.getTime() - 20 * 60 * 1000);
    return [
      {
        NUM: 'ORD-1001',
        CLIENTE: 'Juan Pérez',
        TECNICO: 'Norman Guardado',
        ACTIVIDAD: 'PEXTERNO',
        ESTADO: 'ASIGNADA',
        TIPOORDEN: 'INSTALACION',
        SUBTIPO: 'FTTH',
        SEGMENTO: 'RESIDENCIAL',
        GRUPO: 'PLEX',
        COLONIA: 'Col. Kennedy',
        OLT: 'OLT-TGU-01',
        PON: '1/2/3',
        CAUSA: '',
        MOTIVO: '',
        COMENTARIO: 'Cliente confirmado',
        ATRIBUCION: 'MAXCOM',
        GPS: '14.0818,-87.2068',
        MXREF: 'MX-55501',
        FECHA_APE: '08/09/2026 07:30',
        HORA_INI: '07:45',
        HORA_LIQ: '',
      },
      {
        NUM: 'ORD-1002',
        CLIENTE: 'María López',
        TECNICO: 'Allan Echeverry',
        ACTIVIDAD: 'SPLITTEROPT',
        ESTADO: 'CERRADA',
        TIPOORDEN: 'INSTALACION',
        SUBTIPO: 'FTTH',
        SEGMENTO: 'PYME',
        GRUPO: 'PLEX',
        COLONIA: 'Col. Palmira',
        OLT: 'OLT-TGU-02',
        PON: '2/4/1',
        CAUSA: '',
        MOTIVO: '',
        COMENTARIO: 'Instalada OK',
        ATRIBUCION: 'MAXCOM',
        GPS: '14.0910,-87.1900',
        MXREF: 'MX-55502',
        FECHA_APE: '08/09/2026 08:00',
        HORA_INI: '08:10',
        HORA_LIQ: '10:35',
      },
      {
        NUM: 'ORD-1003',
        CLIENTE: 'Carlos Núñez',
        TECNICO: 'Norman Guardado',
        ACTIVIDAD: 'REPARACION',
        ESTADO: 'NOINSTALADO',
        TIPOORDEN: 'AVERIA',
        SUBTIPO: 'FTTH',
        SEGMENTO: 'RESIDENCIAL',
        GRUPO: 'PLEX',
        COLONIA: 'Col. Miraflores',
        OLT: 'OLT-TGU-01',
        PON: '1/2/5',
        CAUSA: 'CLIENTE AUSENTE',
        MOTIVO: 'No se encontró al cliente',
        COMENTARIO: '',
        ATRIBUCION: 'CLIENTE',
        GPS: '14.0700,-87.1800',
        MXREF: 'MX-55503',
        FECHA_APE: '08/09/2026 09:15',
        HORA_INI: '',
        HORA_LIQ: '',
      },
      {
        // Soporte de fibra abierto hace 3h con equipo caído -> ES_OFFLINE +
        // ALERTA_TIEMPO (SOP sin liquidar hace más de 2h). Fase C.
        NUM: 'ORD-2001',
        CLIENTE: 'Rosa Martínez',
        TECNICO: 'Norman Guardado',
        ACTIVIDAD: 'SOPFIBRA',
        ESTADO: 'ASIGNADA',
        TIPOORDEN: 'AVERIA',
        SUBTIPO: 'FTTH',
        SEGMENTO: 'RESIDENCIAL',
        GRUPO: 'PLEX',
        COLONIA: 'Col. Kennedy',
        OLT: 'OLT-TGU-01',
        PON: '1/2/3',
        CAUSA: '',
        MOTIVO: '',
        COMENTARIO: 'Cliente reporta OFFLINE, ONU sin luz',
        ATRIBUCION: 'MAXCOM',
        GPS: '14.0818,-87.2068',
        MXREF: 'MX-55504',
        FECHA_APE: fmt(hace3h),
        HORA_INI: fmt(hace3h),
        HORA_LIQ: '',
      },
      {
        // Soporte de fibra abierto hace 20 min con equipo caído -> ES_OFFLINE
        // pero sin ALERTA_TIEMPO todavía (recién asignada). Comparte OLT/PON
        // con ORD-2003 para ver la concentración de fallas en el mapa.
        NUM: 'ORD-2004',
        CLIENTE: 'Kevin Zelaya',
        TECNICO: 'Allan Echeverry',
        ACTIVIDAD: 'SOPFIBRA',
        ESTADO: 'ASIGNADA',
        TIPOORDEN: 'AVERIA',
        SUBTIPO: 'FTTH',
        SEGMENTO: 'RESIDENCIAL',
        GRUPO: 'PLEX',
        COLONIA: 'Col. Miraflores',
        OLT: 'OLT-TGU-02',
        PON: '3/1/2',
        CAUSA: '',
        MOTIVO: '',
        COMENTARIO: 'PON ROJO detectado, sin servicio',
        ATRIBUCION: 'MAXCOM',
        GPS: '14.0700,-87.1800',
        MXREF: 'MX-55507',
        FECHA_APE: fmt(hace20min),
        HORA_INI: fmt(hace20min),
        HORA_LIQ: '',
      },
      {
        // Soporte de fibra ya cerrado como falso positivo (el equipo estaba
        // en línea) -> alimenta el diagnóstico de causa raíz, no ES_OFFLINE.
        NUM: 'ORD-2002',
        CLIENTE: 'Sofía Mendoza',
        TECNICO: 'Norman Guardado',
        ACTIVIDAD: 'SOPFIBRA',
        ESTADO: 'CERRADA',
        TIPOORDEN: 'AVERIA',
        SUBTIPO: 'FTTH',
        SEGMENTO: 'RESIDENCIAL',
        GRUPO: 'PLEX',
        COLONIA: 'Col. Kennedy',
        OLT: 'OLT-TGU-01',
        PON: '1/2/4',
        CAUSA: '',
        MOTIVO: '',
        COMENTARIO: 'Cliente reporta lento',
        RAZON_CIERRE_SOP: 'ESTABA ONLINE',
        COMENTARIO_CIERRE: 'Cliente ya navegando normal, se verificó en sitio',
        ATRIBUCION: 'MAXCOM',
        GPS: '14.0818,-87.2068',
        MXREF: 'MX-55505',
        FECHA_APE: '08/09/2026 06:00',
        HORA_INI: '08/09/2026 06:10',
        HORA_LIQ: '08/09/2026 07:00',
      },
      {
        // Soporte de fibra ya cerrado por equipo dañado -> causa raíz
        // "Equipo del cliente (ONU/ONT)". Mismo OLT que ORD-2004.
        NUM: 'ORD-2003',
        CLIENTE: 'Diego Flores',
        TECNICO: 'Allan Echeverry',
        ACTIVIDAD: 'SOPFIBRA',
        ESTADO: 'CERRADA',
        TIPOORDEN: 'AVERIA',
        SUBTIPO: 'FTTH',
        SEGMENTO: 'PYME',
        GRUPO: 'PLEX',
        COLONIA: 'Col. Miraflores',
        OLT: 'OLT-TGU-02',
        PON: '3/1/2',
        CAUSA: '',
        MOTIVO: '',
        COMENTARIO: 'Cliente reporta OFFLINE',
        RAZON_CIERRE_SOP: '',
        COMENTARIO_CIERRE: 'Se cambió ONU quemada por descarga eléctrica',
        ATRIBUCION: 'MAXCOM',
        GPS: '14.0700,-87.1800',
        MXREF: 'MX-55506',
        FECHA_APE: '08/09/2026 05:00',
        HORA_INI: '08/09/2026 05:10',
        HORA_LIQ: '08/09/2026 06:20',
      },
    ];
  }
}
