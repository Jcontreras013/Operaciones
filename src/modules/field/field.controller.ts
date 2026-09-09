import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { FieldIngestService } from './field-ingest.service';
import { IngestDto } from './dto/ingest.dto';

@ApiTags('Campo (monitor: ingesta de órdenes)')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/field')
export class FieldController {
  constructor(private readonly ingest: FieldIngestService) {}

  /** Dispara la ingesta desde Cepheus (idempotente). */
  @Post('ingest')
  runIngest(@CurrentTenant() tenantId: string, @Body() dto: IngestDto) {
    const from = dto.from
      ? new Date(dto.from)
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return this.ingest.ingest(tenantId, from);
  }

  /** Tablero del monitor (totales + agregados por estado/actividad/técnico). */
  @Get('board')
  board(@CurrentTenant() tenantId: string) {
    return this.ingest.getBoard(tenantId);
  }

  /** Diagnóstico de offline: totales, causa raíz y mapa de saturación OLT/PON. */
  @Get('offline')
  offlineBoard(@CurrentTenant() tenantId: string, @Query('days') days?: string) {
    const dias = days ? Number(days) : 30;
    return this.ingest.getOfflineBoard(tenantId, Number.isFinite(dias) && dias > 0 ? dias : 30);
  }

  @Get('work-orders')
  listWorkOrders(
    @CurrentTenant() tenantId: string,
    @Query('estado') estado?: string,
    @Query('tecnico') tecnico?: string,
    @Query('olt') olt?: string,
    @Query('search') search?: string,
  ) {
    return this.ingest.listWorkOrders(tenantId, { estado, tecnico, olt, search });
  }

  @Get('work-orders/:id')
  getWorkOrder(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.ingest.getWorkOrder(tenantId, id);
  }

  @Get('ingest-runs')
  listRuns(@CurrentTenant() tenantId: string) {
    return this.ingest.listRuns(tenantId);
  }
}
