import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { OperationsService } from './operations.service';
import { CreateOperationDto } from './dto/create-operation.dto';
import { AddMilestoneDto } from './dto/add-milestone.dto';
import { AddDocumentDto } from './dto/add-document.dto';
import { AddCostDto } from './dto/add-cost.dto';

@ApiTags('Operaciones')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/operations')
export class OperationsController {
  constructor(private readonly operations: OperationsService) {}

  @Post()
  create(@CurrentTenant() tenantId: string, @Body() dto: CreateOperationDto) {
    return this.operations.create(tenantId, dto);
  }

  @Get()
  list(@CurrentTenant() tenantId: string, @Query('clientId') clientId?: string) {
    return this.operations.list(tenantId, clientId);
  }

  @Get(':id')
  get(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.operations.get(tenantId, id);
  }

  @Get(':id/milestones')
  milestones(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.operations.getMilestones(tenantId, id);
  }

  @Post(':id/milestones')
  addMilestone(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddMilestoneDto,
  ) {
    return this.operations.addMilestone(tenantId, id, dto);
  }

  @Post(':id/documents')
  addDocument(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddDocumentDto,
  ) {
    return this.operations.addDocument(tenantId, id, dto);
  }

  @Post(':id/costs')
  addCost(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddCostDto,
  ) {
    return this.operations.addCost(tenantId, id, dto);
  }
}
