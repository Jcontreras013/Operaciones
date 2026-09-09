import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, CurrentUserId, CurrentUserRole } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { Roles } from '@common/auth/roles.decorator';
import { RolesGuard } from '@common/auth/roles.guard';
import { UserRole } from '@modules/tenancy/entities/user.entity';
import { QualityService } from './quality.service';
import { CreateQualitySurveyDto } from './dto/create-quality-survey.dto';
import { ResolveSeguimientoDto } from './dto/resolve-seguimiento.dto';
import { ContactResult } from './entities/quality-survey.entity';

/**
 * Roles: Llamados es justamente quien hace esta gestión en el monitor
 * original (pestaña "Registrar Gestión de Llamada"), así que entra a todo
 * el módulo igual que Admin/Jefe/Monitoreo.
 */
const QUALITY_ROLES = [UserRole.ADMIN, UserRole.JEFE, UserRole.MONITOREO, UserRole.LLAMADOS];

/** Monitoreo y Llamados solo ven lo que ELLOS registraron (p.ej. Miguel no ve las gestiones de Sac); Admin/Jefe ven todo el tenant. */
const ROLES_VISIBILIDAD_PROPIA: string[] = [UserRole.MONITOREO, UserRole.LLAMADOS];

@ApiTags('Calidad (encuesta de control post-servicio)')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/quality')
@UseGuards(RolesGuard)
@Roles(...QUALITY_ROLES)
export class QualityController {
  constructor(private readonly quality: QualityService) {}

  /** userId si el rol solo debe ver lo suyo; undefined (todo el tenant) para Admin/Jefe. */
  private alcance(userId: string | undefined, role: string | undefined): string | undefined {
    return role && ROLES_VISIBILIDAD_PROPIA.includes(role) ? userId : undefined;
  }

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
    @CurrentUserId() userId: string | undefined,
    @CurrentUserRole() role: string | undefined,
    @Query('workOrderId') workOrderId?: string,
    @Query('contactResult') contactResult?: ContactResult,
    @Query('pendientes') pendientes?: string,
  ) {
    return this.quality.list(
      tenantId,
      { workOrderId, contactResult, pendientes: pendientes === 'true' },
      this.alcance(userId, role),
    );
  }

  @Patch('surveys/:id/seguimiento')
  resolverSeguimiento(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @CurrentUserRole() role: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ResolveSeguimientoDto,
  ) {
    return this.quality.resolverSeguimiento(tenantId, id, dto.resuelto, this.alcance(userId, role));
  }

  /** CSAT oficial (P7), diagnóstico (P1-P6) y seguimientos pendientes. */
  @Get('report')
  report(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @CurrentUserRole() role: string | undefined,
    @Query('days') days?: string,
  ) {
    const dias = days ? Number(days) : 30;
    return this.quality.getReport(tenantId, Number.isFinite(dias) && dias > 0 ? dias : 30, this.alcance(userId, role));
  }
}
