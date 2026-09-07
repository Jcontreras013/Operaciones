import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { FleetService } from './fleet.service';
import { DeliveryService } from './delivery.service';
import { DeliveryStatus } from './delivery.enums';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateCarrierDto } from './dto/create-carrier.dto';
import { CreateDeliveryDto } from './dto/create-delivery.dto';
import { CreateRouteDto } from './dto/create-route.dto';
import { AssignStopsDto } from './dto/assign-stops.dto';
import { CompleteDeliveryDto } from './dto/complete-delivery.dto';
import { FailDeliveryDto } from './dto/fail-delivery.dto';

@ApiTags('TMS / Última milla')
@ApiSecurity(TENANT_AUTH)
@Controller('v1')
export class DeliveryController {
  constructor(
    private readonly fleet: FleetService,
    private readonly delivery: DeliveryService,
  ) {}

  // --- Flota propia y carriers ---

  @Post('vehicles')
  createVehicle(@CurrentTenant() tenantId: string, @Body() dto: CreateVehicleDto) {
    return this.fleet.createVehicle(tenantId, dto);
  }

  @Get('vehicles')
  listVehicles(@CurrentTenant() tenantId: string) {
    return this.fleet.listVehicles(tenantId);
  }

  @Post('carriers')
  createCarrier(@CurrentTenant() tenantId: string, @Body() dto: CreateCarrierDto) {
    return this.fleet.createCarrier(tenantId, dto);
  }

  @Get('carriers')
  listCarriers(@CurrentTenant() tenantId: string) {
    return this.fleet.listCarriers(tenantId);
  }

  // --- Entregas (pool) ---

  @Post('deliveries')
  createDelivery(@CurrentTenant() tenantId: string, @Body() dto: CreateDeliveryDto) {
    return this.delivery.createDelivery(tenantId, dto);
  }

  @Get('deliveries')
  listDeliveries(
    @CurrentTenant() tenantId: string,
    @Query('status') status?: DeliveryStatus,
    @Query('routeId') routeId?: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.delivery.listDeliveries(tenantId, { status, routeId, clientId });
  }

  @Get('deliveries/:id')
  getDelivery(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.getDelivery(tenantId, id);
  }

  @Post('deliveries/:id/complete')
  complete(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CompleteDeliveryDto,
  ) {
    return this.delivery.completeDelivery(tenantId, id, dto);
  }

  @Post('deliveries/:id/fail')
  fail(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: FailDeliveryDto,
  ) {
    return this.delivery.failDelivery(tenantId, id, dto);
  }

  // --- Rutas ---

  @Post('routes')
  createRoute(@CurrentTenant() tenantId: string, @Body() dto: CreateRouteDto) {
    return this.delivery.createRoute(tenantId, dto);
  }

  @Get('routes')
  listRoutes(@CurrentTenant() tenantId: string, @Query('date') date?: string) {
    return this.delivery.listRoutes(tenantId, date);
  }

  @Get('routes/:id')
  getRoute(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.getRoute(tenantId, id);
  }

  @Get('routes/:id/stops')
  routeStops(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.getRouteStops(tenantId, id);
  }

  @Post('routes/:id/stops')
  assignStops(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignStopsDto,
  ) {
    return this.delivery.assignStops(tenantId, id, dto.deliveryIds);
  }

  @Post('routes/:id/optimize')
  optimize(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.optimizeRoute(tenantId, id);
  }

  @Post('routes/:id/dispatch')
  dispatch(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.delivery.dispatchRoute(tenantId, id);
  }
}
