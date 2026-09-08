import { Injectable, Logger } from '@nestjs/common';
import { CepheusConnector, RawOrder } from './cepheus-connector';

/**
 * Conector Cepheus de la Fase A: devuelve órdenes de ejemplo con la MISMA forma
 * que la API real (claves en mayúsculas), para construir y probar la ingesta
 * sin depender de credenciales. Se reemplaza por el adaptador HTTP real.
 */
@Injectable()
export class StubCepheusConnector implements CepheusConnector {
  private readonly logger = new Logger(StubCepheusConnector.name);

  async fetchOrders(dateFrom: Date): Promise<RawOrder[]> {
    const d = dateFrom.toLocaleDateString('es-HN');
    this.logger.log(`Cepheus (stub): devolviendo órdenes de ejemplo desde ${d}`);
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
    ];
  }
}
