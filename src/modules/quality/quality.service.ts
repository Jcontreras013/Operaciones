import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { WorkOrder } from '@modules/field/entities/work-order.entity';
import { ContactResult, QualitySurvey } from './entities/quality-survey.entity';
import { CreateQualitySurveyDto } from './dto/create-quality-survey.dto';

/** Las 6 preguntas de diagnóstico (todo menos P7, que es el indicador oficial). */
const PREGUNTAS_DIAGNOSTICO: {
  campo: 'p1Puntualidad' | 'p2PresentacionTrato' | 'p3ClaridadExplicacion' | 'p4TvCcveo' | 'p5CalidadServicio' | 'p6Limpieza';
  etiqueta: string;
}[] = [
  { campo: 'p1Puntualidad', etiqueta: 'Puntualidad del técnico' },
  { campo: 'p2PresentacionTrato', etiqueta: 'Presentación y trato' },
  { campo: 'p3ClaridadExplicacion', etiqueta: 'Claridad de la explicación' },
  { campo: 'p4TvCcveo', etiqueta: 'Explicación TV Cable / CCVEO' },
  { campo: 'p5CalidadServicio', etiqueta: 'Calidad del servicio' },
  { campo: 'p6Limpieza', etiqueta: 'Estado del área de trabajo' },
];

export interface QualityReport {
  desde: string;
  totalGestiones: number;
  porResultado: { key: string; count: number }[];
  totalRespuestasValidas: number;
  csat: number | null;
  diagnostico: { campo: string; etiqueta: string; promedio: number | null; respuestas: number }[];
  seguimientosPendientes: QualitySurvey[];
}

/**
 * Encuesta de control de calidad post-servicio. Reemplaza la pestaña
 * "Registrar Gestión de Llamada" de `ccalidad.py` en monitor-operativo — sin
 * el envío por WhatsApp (WATI es un servicio de paga que no se está usando).
 *
 * P1-P6 son diagnóstico; P7 es el indicador oficial de CSAT:
 *   CSAT = (respuestas con P7 en {4,5}) / (total de respuestas válidas) × 100
 * "Respuestas válidas" = llamadas CONTESTADAS (el universo de la encuesta).
 *
 * Visibilidad: `soloPropio` (id del usuario) restringe todo a lo que ESE
 * usuario registró (`gestionadoPor`). El controlador decide cuándo pasarlo
 * según el rol (Monitoreo/Llamados solo ven lo suyo -- p.ej. Miguel no ve
 * las gestiones de Sac, cada quien ve solo su propio trabajo; Admin/Jefe no
 * mandan `soloPropio` y ven todo el tenant).
 */
@Injectable()
export class QualityService {
  constructor(
    @InjectRepository(QualitySurvey) private readonly surveys: Repository<QualitySurvey>,
    @InjectRepository(WorkOrder) private readonly orders: Repository<WorkOrder>,
  ) {}

  async create(tenantId: string, dto: CreateQualitySurveyDto, userId?: string): Promise<QualitySurvey> {
    const order = await this.orders.findOne({ where: { tenantId, id: dto.workOrderId } });
    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    const contestada = dto.contactResult === ContactResult.CONTESTADA;
    const p4NoAplica = contestada ? Boolean(dto.p4NoAplica) : false;
    const requiereSeguimiento = Boolean(dto.requiereSeguimiento);

    const survey = this.surveys.create({
      tenantId,
      workOrderId: order.id,
      externalNum: order.externalNum,
      cliente: order.cliente,
      tecnico: order.tecnico,
      actividad: order.actividad,
      contactResult: dto.contactResult,
      p1Puntualidad: contestada ? (dto.p1Puntualidad ?? null) : null,
      p2PresentacionTrato: contestada ? (dto.p2PresentacionTrato ?? null) : null,
      p3ClaridadExplicacion: contestada ? (dto.p3ClaridadExplicacion ?? null) : null,
      p4NoAplica,
      p4TvCcveo: contestada && !p4NoAplica ? (dto.p4TvCcveo ?? null) : null,
      p5CalidadServicio: contestada ? (dto.p5CalidadServicio ?? null) : null,
      p6Limpieza: contestada ? (dto.p6Limpieza ?? null) : null,
      p7Satisfaccion: contestada ? (dto.p7Satisfaccion ?? null) : null,
      comentarioMejora: dto.comentarioMejora?.trim() || null,
      aprobacionInterna: contestada ? (dto.aprobacionInterna ?? null) : null,
      firmante: dto.firmante?.trim() || null,
      horaCierre: dto.horaCierre?.trim() || null,
      fechaVisita: dto.fechaVisita?.trim() || null,
      requiereSeguimiento,
      seguimientoTicket: requiereSeguimiento ? (dto.seguimientoTicket ?? null) : null,
      seguimientoResponsable: requiereSeguimiento ? (dto.seguimientoResponsable ?? null) : null,
      seguimientoFechaLimite: requiereSeguimiento ? (dto.seguimientoFechaLimite ?? null) : null,
      seguimientoResuelto: false,
      gestionadoPor: userId ?? null,
    });

    return this.surveys.save(survey);
  }

  list(
    tenantId: string,
    filters: { workOrderId?: string; contactResult?: ContactResult; pendientes?: boolean } = {},
    soloPropio?: string,
  ): Promise<QualitySurvey[]> {
    const where: FindOptionsWhere<QualitySurvey> = { tenantId };
    if (filters.workOrderId) where.workOrderId = filters.workOrderId;
    if (filters.contactResult) where.contactResult = filters.contactResult;
    if (filters.pendientes) {
      where.requiereSeguimiento = true;
      where.seguimientoResuelto = false;
    }
    if (soloPropio) where.gestionadoPor = soloPropio;
    return this.surveys.find({ where, order: { createdAt: 'DESC' }, take: 200 });
  }

  async resolverSeguimiento(
    tenantId: string,
    id: string,
    resuelto: boolean,
    soloPropio?: string,
  ): Promise<QualitySurvey> {
    const where: FindOptionsWhere<QualitySurvey> = { tenantId, id };
    if (soloPropio) where.gestionadoPor = soloPropio;
    const survey = await this.surveys.findOne({ where });
    if (!survey) {
      throw new NotFoundException('Registro de calidad no encontrado');
    }
    survey.seguimientoResuelto = resuelto;
    return this.surveys.save(survey);
  }

  /** Reporte de calidad: CSAT oficial (P7), diagnóstico (P1-P6) y seguimientos pendientes. */
  async getReport(tenantId: string, dias = 30, soloPropio?: string): Promise<QualityReport> {
    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000);

    const [totalGestiones, porResultado, totalRespuestasValidas, positivas, diagnostico, seguimientosPendientes] =
      await Promise.all([
        this.contarConFiltro(tenantId, desde, soloPropio),
        this.porResultado(tenantId, desde, soloPropio),
        this.contarConFiltro(tenantId, desde, soloPropio, ContactResult.CONTESTADA),
        this.contarPositivas(tenantId, desde, soloPropio),
        Promise.all(
          PREGUNTAS_DIAGNOSTICO.map(async ({ campo, etiqueta }) => ({
            campo,
            etiqueta,
            ...(await this.avgColumn(tenantId, desde, campo, soloPropio)),
          })),
        ),
        this.seguimientosPendientes(tenantId, soloPropio),
      ]);

    const csat = totalRespuestasValidas > 0 ? (positivas / totalRespuestasValidas) * 100 : null;

    return {
      desde: desde.toISOString(),
      totalGestiones,
      porResultado,
      totalRespuestasValidas,
      csat,
      diagnostico,
      seguimientosPendientes,
    };
  }

  /** Aplica el filtro `gestionadoPor = soloPropio` a un query builder, si viene definido. */
  private conAlcance<T extends object>(
    qb: SelectQueryBuilder<T>,
    soloPropio: string | undefined,
  ): SelectQueryBuilder<T> {
    return soloPropio ? qb.andWhere('q.gestionadoPor = :soloPropio', { soloPropio }) : qb;
  }

  private contarConFiltro(
    tenantId: string,
    desde: Date,
    soloPropio: string | undefined,
    contactResult?: ContactResult,
  ): Promise<number> {
    let qb = this.surveys
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId })
      .andWhere('q.createdAt >= :desde', { desde });
    if (contactResult) qb = qb.andWhere('q.contactResult = :cr', { cr: contactResult });
    return this.conAlcance(qb, soloPropio).getCount();
  }

  private async porResultado(
    tenantId: string,
    desde: Date,
    soloPropio: string | undefined,
  ): Promise<{ key: string; count: number }[]> {
    const qb = this.surveys
      .createQueryBuilder('q')
      .select('q.contactResult', 'key')
      .addSelect('COUNT(*)', 'count')
      .where('q.tenantId = :tenantId', { tenantId })
      .andWhere('q.createdAt >= :desde', { desde })
      .groupBy('q.contactResult')
      .orderBy('count', 'DESC');
    const rows = await this.conAlcance(qb, soloPropio).getRawMany<{ key: string; count: string }>();
    return rows.map((r) => ({ key: r.key, count: Number(r.count) }));
  }

  private contarPositivas(tenantId: string, desde: Date, soloPropio: string | undefined): Promise<number> {
    const qb = this.surveys
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId })
      .andWhere('q.createdAt >= :desde', { desde })
      .andWhere('q.contactResult = :cr', { cr: ContactResult.CONTESTADA })
      .andWhere('q.p7Satisfaccion IN (:...vals)', { vals: [4, 5] });
    return this.conAlcance(qb, soloPropio).getCount();
  }

  /** Promedio (excluyendo nulos, p.ej. P4 con "No aplica") de una columna de calificación. */
  private async avgColumn(
    tenantId: string,
    desde: Date,
    column: string,
    soloPropio: string | undefined,
  ): Promise<{ promedio: number | null; respuestas: number }> {
    const qb = this.surveys
      .createQueryBuilder('q')
      .select(`AVG(q.${column})`, 'avg')
      .addSelect(`COUNT(q.${column})`, 'n')
      .where('q.tenantId = :tenantId', { tenantId })
      .andWhere('q.createdAt >= :desde', { desde })
      .andWhere(`q.${column} IS NOT NULL`);
    const row = await this.conAlcance(qb, soloPropio).getRawOne<{ avg: string | null; n: string }>();
    return { promedio: row?.avg != null ? Number(row.avg) : null, respuestas: Number(row?.n ?? 0) };
  }

  private seguimientosPendientes(tenantId: string, soloPropio: string | undefined): Promise<QualitySurvey[]> {
    const qb = this.surveys
      .createQueryBuilder('q')
      .where('q.tenantId = :tenantId', { tenantId })
      .andWhere('q.requiereSeguimiento = true')
      .andWhere('q.seguimientoResuelto = false')
      .orderBy('q.seguimientoFechaLimite', 'ASC', 'NULLS LAST')
      .limit(100);
    return this.conAlcance(qb, soloPropio).getMany();
  }
}
