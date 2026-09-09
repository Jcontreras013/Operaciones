import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, CurrentUserId } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { QualityService } from './quality.service';
import { CreateQualitySurveyDto } from './dto/create-quality-survey.dto';
import { ResolveSeguimientoDto } from './dto/resolve-seguimiento.dto';
import { ContactResult } from './entities/quality-survey.entity';

@ApiTags('Calidad (encuesta de control post-servicio)')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/quality')
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  @Post('surveys')
  create(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @Body() dto: CreateQualitySurveyDto,
  ) {
    return this.quality.create(tenantId, dto, userId);
  }

  @Get('surveys')
  list(
    @CurrentTenant() tenantId: string,
    @Query('workOrderId') workOrderId?: string,
    @Query('contactResult') contactResult?: ContactResult,
    @Query('pendientes') pendientes?: string,
  ) {
    return this.quality.list(tenantId, { workOrderId, contactResult, pendientes: pendientes === 'true' });
  }

  @Patch('surveys/:id/seguimiento')
  resolverSeguimiento(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveSeguimientoDto,
  ) {
    return this.quality.resolverSeguimiento(tenantId, id, dto.resuelto);
  }

  /** CSAT oficial (P7), diagnóstico (P1-P6) y seguimientos pendientes. */
  @Get('report')
  report(@CurrentTenant() tenantId: string, @Query('days') days?: string) {
    const dias = days ? Number(days) : 30;
    return this.quality.getReport(tenantId, Number.isFinite(dias) && dias > 0 ? dias : 30);
  }
}
