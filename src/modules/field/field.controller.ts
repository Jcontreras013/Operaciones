import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, CurrentUserId } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { Roles } from '@common/auth/roles.decorator';
import { RolesGuard } from '@common/auth/roles.guard';
import { UserRole } from '@modules/tenancy/entities/user.entity';
import { FieldIngestService } from './field-ingest.service';
import { IngestDto } from './dto/ingest.dto';
import { CreateManualWorkOrderDto } from './dto/create-manual-work-order.dto';
import { RegistrarAlmuerzoDto } from './dto/registrar-almuerzo.dto';

/**
 * Roles: mismo modelo que el monitor original (Admin/Jefe/Monitoreo/
 * Llamados) — "Forzar actualización" era exclusivo de Admin; "Monitor en
 * Vivo" (tablero) lo veían Admin/Jefe/Monitoreo; el historial de corridas y
 * el diagnóstico de offline (más de análisis que de operación diaria) se
 * quedan en Admin/Jefe. Llamados sí entra a la búsqueda de órdenes — la
 * necesita para encontrar la orden al registrar una gestión en Calidad.
 */
@ApiTags('Campo (monitor: ingesta de órdenes)')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/field')
@UseGuards(RolesGuard)
export class FieldController {
  constructor(private readonly ingest: FieldIngestService) {}

  /** Dispara la ingesta desde Cepheus (idempotente). Solo Admin. */
  @Post('ingest')
  @Roles(UserRole.ADMIN)
  runIngest(@CurrentTenant() tenantId: string, @Body() dto: IngestDto) {
    const from = dto.from
      ? new Date(dto.from)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.ingest.ingest(tenantId, from);
  }

  /** Tablero del monitor (totales + agregados por estado/actividad/técnico). */
  @Get('board')
  @Roles(UserRole.ADMIN, UserRole.JEFE, UserRole.MONITOREO)
  board(@CurrentTenant() tenantId: string) {
    return this.ingest.getBoard(tenantId);
  }

  /** Diagnóstico de offline: totales, causa raíz y mapa de saturación OLT/PON. */
  @Get('offline')
  @Roles(UserRole.ADMIN, UserRole.JEFE)
  offlineBoard(@CurrentTenant() tenantId: string, @Query('days') days?: string) {
    const dias = days ? Number(days) : 30;
    return this.ingest.getOfflineBoard(tenantId, Number.isFinite(dias) && dias > 0 ? dias : 30);
  }

  /** También la usa Calidad para buscar la orden al registrar una gestión. */
  @Get('work-orders')
  @Roles(UserRole.ADMIN, UserRole.JEFE, UserRole.MONITOREO, UserRole.LLAMADOS)
  listWorkOrders(
    @CurrentTenant() tenantId: string,
    @Query('estado') estado?: string,
    @Query('actividad') actividad?: string,
    @Query('motivo') motivo?: string,
    @Query('tecnico') tecnico?: string,
    @Query('olt') olt?: string,
    @Query('search') search?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('criticas') criticas?: string,
    @Query('noAsignadas') noAsignadas?: string,
  ) {
    const lista = (v?: string) => (v ? v.split(',').filter(Boolean) : undefined);
    return this.ingest.listWorkOrders(tenantId, {
      estado: lista(estado),
      actividad: lista(actividad),
      motivo: lista(motivo),
      tecnico,
      olt,
      search,
      from,
      to,
      criticas: criticas === 'true',
      noAsignadas: noAsignadas === 'true',
    });
  }

  /** Línea de tiempo por técnico (Gantt) de un día calendario en Honduras. */
  @Get('gantt')
  @Roles(UserRole.ADMIN, UserRole.JEFE, UserRole.MONITOREO)
  getGantt(@CurrentTenant() tenantId: string, @Query('date') date?: string) {
    const dateStr = date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });
    return this.ingest.getGantt(tenantId, dateStr);
  }

  /**
   * "Ingresar Orden Manual": para cuando la API de Cepheus falla y una orden
   * real de un técnico no se refleja en el sistema. Mismo acceso que el
   * original (es_admin_o_supervisor = Admin/Jefe). Declaradas ANTES de
   * 'work-orders/:id' — si no, ':id' capturaría 'manual' como si fuera un id.
   */
  @Post('work-orders/manual')
  @Roles(UserRole.ADMIN, UserRole.JEFE)
  crearOrdenManual(
    @CurrentTenant() tenantId: string,
    @Body() dto: CreateManualWorkOrderDto,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.ingest.crearOrdenManual(tenantId, dto, userId ?? 'desconocido');
  }

  @Get('work-orders/manual')
  @Roles(UserRole.ADMIN, UserRole.JEFE)
  listOrdenesManuales(@CurrentTenant() tenantId: string) {
    return this.ingest.listOrdenesManuales(tenantId);
  }

  /** Borra una orden manual — la versión real de Cepheus (si existe) vuelve a mostrarse. */
  @Delete('work-orders/manual/:externalNum')
  @Roles(UserRole.ADMIN, UserRole.JEFE)
  borrarOrdenManual(@CurrentTenant() tenantId: string, @Param('externalNum') externalNum: string) {
    return this.ingest.borrarOrdenManual(tenantId, externalNum);
  }

  @Get('work-orders/:id')
  @Roles(UserRole.ADMIN, UserRole.JEFE, UserRole.MONITOREO, UserRole.LLAMADOS)
  getWorkOrder(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ingest.getWorkOrder(tenantId, id);
  }

  @Get('ingest-runs')
  @Roles(UserRole.ADMIN, UserRole.JEFE)
  listRuns(@CurrentTenant() tenantId: string) {
    return this.ingest.listRuns(tenantId);
  }

  /** Centro de Reportes: KPIs, tablero de carga y consolidado por segmento. */
  @Get('reportes')
  @Roles(UserRole.ADMIN, UserRole.JEFE)
  getReportes(@CurrentTenant() tenantId: string) {
    return this.ingest.getReportesBoard(tenantId);
  }

  /** "Registrar Almuerzo": la ventana de almuerzo de un técnico en un día. */
  @Post('almuerzos')
  @Roles(UserRole.ADMIN, UserRole.JEFE)
  registrarAlmuerzo(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegistrarAlmuerzoDto,
    @CurrentUserId() userId: string | undefined,
  ) {
    return this.ingest.registrarAlmuerzo(tenantId, dto, userId ?? 'desconocido');
  }

  /** Almuerzos de un día calendario de Honduras (para el Gantt). */
  @Get('almuerzos')
  @Roles(UserRole.ADMIN, UserRole.JEFE, UserRole.MONITOREO)
  getAlmuerzos(@CurrentTenant() tenantId: string, @Query('date') date?: string) {
    const dateStr = date ?? new Date().toLocaleDateString('en-CA', { timeZone: 'America/Tegucigalpa' });
    return this.ingest.getAlmuerzos(tenantId, dateStr);
  }
}
