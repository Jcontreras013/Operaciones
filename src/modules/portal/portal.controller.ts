import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { CurrentClient } from './current-client.decorator';
import { PortalStore } from './portal-context';
import { PortalService } from './portal.service';
import { OperationStatus } from '@modules/operations/entities/operation.entity';

/**
 * Portal de cliente (E4). Todas las rutas resuelven el cliente desde el usuario
 * autenticado (PortalContext); el cliente solo ve lo suyo.
 */
@Controller('portal')
export class PortalController {
  constructor(private readonly portal: PortalService) {}

  /** Perfil de la sesión de portal (para el frontend). */
  @Get('me')
  me(@CurrentClient() ctx: PortalStore) {
    return { clientId: ctx.clientId, clientUserId: ctx.clientUserId };
  }

  @Get('operations')
  listOperations(
    @CurrentClient() ctx: PortalStore,
    @Query('status') status?: OperationStatus,
    @Query('reference') reference?: string,
  ) {
    return this.portal.listOperations(ctx.tenantId, ctx.clientId, { status, reference });
  }

  @Get('operations/:id')
  getOperation(@CurrentClient() ctx: PortalStore, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.getOperation(ctx.tenantId, ctx.clientId, id);
  }

  @Get('operations/:id/milestones')
  milestones(@CurrentClient() ctx: PortalStore, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.getMilestones(ctx.tenantId, ctx.clientId, id);
  }

  @Get('operations/:id/documents')
  documents(@CurrentClient() ctx: PortalStore, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.getDocuments(ctx.tenantId, ctx.clientId, id);
  }

  @Get('invoices')
  listInvoices(@CurrentClient() ctx: PortalStore) {
    return this.portal.listInvoices(ctx.tenantId, ctx.clientId);
  }

  @Get('invoices/:id/lines')
  invoiceLines(@CurrentClient() ctx: PortalStore, @Param('id', ParseUUIDPipe) id: string) {
    return this.portal.getInvoiceLines(ctx.tenantId, ctx.clientId, id);
  }
}
