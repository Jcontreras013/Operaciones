import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { TenancyService } from './tenancy.service';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('Operador (tenancy)')
@ApiSecurity(TENANT_AUTH)
@Controller('v1')
export class TenancyController {
  constructor(private readonly tenancy: TenancyService) {}

  /** Ruta pública: alta de operador. Excluida del middleware de tenant. */
  @Post('tenants')
  createTenant(@Body() dto: CreateTenantDto) {
    return this.tenancy.createTenant(dto);
  }

  /** Operador actual (según x-tenant-id). */
  @Get('tenant')
  getTenant(@CurrentTenant() tenantId: string) {
    return this.tenancy.getTenant(tenantId);
  }

  @Post('users')
  addUser(@CurrentTenant() tenantId: string, @Body() dto: CreateUserDto) {
    return this.tenancy.addUser(tenantId, dto);
  }

  @Get('users')
  listUsers(@CurrentTenant() tenantId: string) {
    return this.tenancy.listUsers(tenantId);
  }
}
