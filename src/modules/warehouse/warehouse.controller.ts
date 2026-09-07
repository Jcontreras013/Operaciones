import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, CurrentUserId } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { WarehouseService } from './warehouse.service';
import { InventoryService } from './inventory.service';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CreateLocationDto } from './dto/create-location.dto';
import { ReceiptDto } from './dto/receipt.dto';
import { PickDto } from './dto/pick.dto';
import { MoveDto } from './dto/move.dto';

@ApiTags('Almacén (WMS)')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/warehouses')
export class WarehouseController {
  constructor(
    private readonly warehouses: WarehouseService,
    private readonly inventory: InventoryService,
  ) {}

  // --- Configuración ---

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateWarehouseDto) {
    return this.warehouses.createWarehouse(tenantId, dto);
  }

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.warehouses.listWarehouses(tenantId);
  }

  @Get(':id')
  get(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.warehouses.getWarehouse(tenantId, id);
  }

  @Post(':id/locations')
  createLocation(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CreateLocationDto,
  ) {
    return this.warehouses.createLocation(tenantId, id, dto);
  }

  @Get(':id/locations')
  listLocations(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.warehouses.listLocations(tenantId, id);
  }

  // --- Movimientos de inventario ---

  @Post(':id/receipts')
  receipt(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReceiptDto,
  ) {
    return this.inventory.receipt(tenantId, id, dto, userId);
  }

  @Post(':id/picks')
  pick(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: PickDto,
  ) {
    return this.inventory.pick(tenantId, id, dto, userId);
  }

  @Post(':id/moves')
  move(
    @CurrentTenant() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: MoveDto,
  ) {
    return this.inventory.move(tenantId, id, dto, userId);
  }

  // --- Consultas ---

  @Get(':id/inventory')
  inventory_(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clientId') clientId?: string,
    @Query('sku') sku?: string,
  ) {
    return this.inventory.getInventory(tenantId, id, { clientId, sku });
  }

  @Get(':id/inventory/summary')
  summary(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.inventory.getInventorySummary(tenantId, id, clientId);
  }

  @Get(':id/movements')
  movements(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('clientId') clientId?: string,
  ) {
    return this.inventory.getMovements(tenantId, id, clientId);
  }
}
