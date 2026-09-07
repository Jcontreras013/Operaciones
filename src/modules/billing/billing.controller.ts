import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { BillingService } from './billing.service';
import { CreateRateCardDto } from './dto/create-rate-card.dto';
import { AddChargeDto } from './dto/add-charge.dto';
import { GenerateInvoiceDto } from './dto/generate-invoice.dto';
import { RegisterCarrierInvoiceDto } from './dto/register-carrier-invoice.dto';

@ApiTags('Facturación')
@ApiSecurity(TENANT_AUTH)
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

  // --- Conciliación de facturas de carrier (US3.4) ---

  @Post('carrier-invoices')
  registerCarrierInvoice(
    @CurrentTenant() tenantId: string,
    @Body() dto: RegisterCarrierInvoiceDto,
  ) {
    return this.billing.registerCarrierInvoice(tenantId, dto);
  }

  @Get('carrier-invoices')
  listCarrierInvoices(@CurrentTenant() tenantId: string) {
    return this.billing.listCarrierInvoices(tenantId);
  }

  @Get('carrier-invoices/:id')
  getCarrierInvoice(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.billing.getCarrierInvoice(tenantId, id);
  }

  @Get('carrier-invoices/:id/lines')
  carrierInvoiceLines(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billing.getCarrierInvoiceLines(tenantId, id);
  }

  /** Concilia contra los costos registrados. `toleranceMinor` admite variaciones menores. */
  @Post('carrier-invoices/:id/reconcile')
  reconcileCarrierInvoice(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Query('toleranceMinor', new DefaultValuePipe(0), ParseIntPipe) toleranceMinor: number,
  ) {
    return this.billing.reconcileCarrierInvoice(tenantId, id, toleranceMinor);
  }

  // --- Margen por operación (soporta la verificación antes de facturar) ---

  @Get('operations/:id/financials')
  operationFinancials(
    @CurrentTenant() tenantId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.billing.getOperationFinancials(tenantId, id);
  }
}
