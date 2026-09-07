import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { BillingService } from './billing.service';
import { CreateRateCardDto } from './dto/create-rate-card.dto';
import { AddChargeDto } from './dto/add-charge.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';

@Controller('v1')
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  // --- Rate cards (US3.1) ---

  @Post('clients/:clientId/rate-cards')
  createRateCard(
    @CurrentTenant() tenantId: string,
    @Param('clientId', ParseUUIDPipe) clientId: string,
    @Body() dto: CreateRateCardDto,
  ) {
    return this.billing.createRateCard(tenantId, clientId, dto);
  }

  @Get('clients/:clientId/rate-cards')
  listRateCards(
    @CurrentTenant() tenantId: string,
    @Param('clientId', ParseUUIDPipe) clientId: string,
  ) {
    return this.billing.listRateCards(tenantId, clientId);
  }

  // --- Cargos (US3.2) ---

  @Post('operations/:id/charges')
  addCharge(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) operationId: string,
    @Body() dto: AddChargeDto,
  ) {
    return this.billing.addManualCharge(tenantId, operationId, dto);
  }

  @Get('operations/:id/charges')
  listCharges(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) operationId: string,
  ) {
    return this.billing.listCharges(tenantId, operationId);
  }

  // --- Facturas (US3.3). 'generate' se declara antes de ':id'. ---

  @Post('invoices/generate')
  generateInvoice(@CurrentTenant() tenantId: string, @Body() dto: GenerateInvoiceDto) {
    return this.billing.generateInvoice(tenantId, dto);
  }

  @Get('invoices')
  listInvoices(@CurrentTenant() tenantId: string, @Query('clientId') clientId?: string) {
    return this.billing.listInvoices(tenantId, clientId);
  }

  @Get('invoices/:id')
  getInvoice(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.getInvoice(tenantId, id);
  }

  @Get('invoices/:id/lines')
  getInvoiceLines(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.getInvoiceLines(tenantId, id);
  }

  @Post('invoices/:id/approve')
  approveInvoice(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.approveInvoice(tenantId, id);
  }

  @Post('invoices/:id/issue')
  issueInvoice(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.issueInvoice(tenantId, id);
  }
}
