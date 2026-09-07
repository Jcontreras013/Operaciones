import {
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { VisibilityService } from './visibility.service';

@ApiTags('Visibilidad')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/visibility')
export class VisibilityController {
  constructor(private readonly visibility: VisibilityService) {}

  /** Tablero de operaciones (US5.1). */
  @Get('board')
  board(@CurrentTenant() tenantId: string, @Query('clientId') clientId?: string) {
    return this.visibility.getBoard(tenantId, clientId);
  }

  /** Alertas de excepción (US5.2). `staleHours` configura el umbral (default 24). */
  @Get('exceptions')
  exceptions(
    @CurrentTenant() tenantId: string,
    @Query('staleHours', new DefaultValuePipe(24), ParseIntPipe) staleHours: number,
  ) {
    return this.visibility.getExceptions(tenantId, staleHours);
  }

  /** KPIs por cliente (US5.3). */
  @Get('clients/:clientId/kpis')
  kpis(
    @CurrentTenant() tenantId: string,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.visibility.getClientKpis(tenantId, clientId);
  }
}
