import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { ClientsService } from './clients.service';
import { CreateClientDto } from './dto/create-client.dto';
import { CreateClientUserDto } from './dto/create-client-user.dto';

@ApiTags('Clientes')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/clients')
export class ClientsController {
  constructor(private readonly clients: ClientsService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateClientDto) {
    return this.clients.create(tenantId, dto);
  }

  @Get()
  list(@CurrentTenant() tenantId: string) {
    return this.clients.list(tenantId);
  }

  @Get(':id')
  get(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.clients.get(tenantId, id);
  }

  @Post(':clientId/users')
  addClientUser(
    @CurrentTenant() tenantId: string,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateClientUserDto,
  ) {
    return this.clients.addClientUser(tenantId, clientId, dto);
  }

  @Get(':clientId/users')
  listClientUsers(
    @CurrentTenant() tenantId: string,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.clients.listClientUsers(tenantId, clientId);
  }
}
