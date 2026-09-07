import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, ILike, Repository } from 'typeorm';
import { Operation, OperationStatus } from '@modules/operations/entities/operation.entity';
import { Milestone } from '@modules/operations/entities/milestone.entity';
import { Document } from '@modules/operations/entities/document.entity';
import { Invoice } from '@modules/billing/entities/invoice.entity';
import { InvoiceLine } from '@modules/billing/entities/invoice-line.entity';

export interface OperationFilters {
  status?: OperationStatus;
  reference?: string;
}

/**
 * Servicio del portal de cliente (E4). Solo lectura, y toda consulta filtra por
 * `tenantId` Y `clientId` derivados del usuario autenticado — nunca del request.
 */
@Injectable()
export class PortalService {
  constructor(
    @InjectRepository(Operation) private readonly operations: Repository<Operation>,
    @InjectRepository(Milestone) private readonly milestones: Repository<Milestone>,
    @InjectRepository(Document) private readonly documents: Repository<Document>,
    @InjectRepository(Invoice) private readonly invoices: Repository<Invoice>,
    @InjectRepository(InvoiceLine) private readonly invoiceLines: Repository<InvoiceLine>,
  ) {}

  /** Estado de las operaciones del cliente, con filtros opcionales (US4.1, US4.3). */
  listOperations(
    tenantId: string,
    clientId: string,
    filters: OperationFilters = {},
  ): Promise<Operation[]> {
    const where: FindOptionsWhere<Operation> = { tenantId, clientId };
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.reference) {
      where.reference = ILike(`%${filters.reference}%`);
    }
    return this.operations.find({ where, order: { updatedAt: 'DESC' } });
  }

  async getOperation(tenantId: string, clientId: string, id: string): Promise<Operation> {
    const operation = await this.operations.findOne({ where: { tenantId, clientId, id } });
    if (!operation) {
      throw new NotFoundException('Operación no encontrada');
    }
    return operation;
  }

  async getMilestones(tenantId: string, clientId: string, operationId: string): Promise<Milestone[]> {
    await this.getOperation(tenantId, clientId, operationId); // asegura pertenencia
    return this.milestones.find({
      where: { tenantId, operationId },
      order: { occurredAt: 'ASC' },
    });
  }

  /** Documentos de una operación del cliente (US4.2). */
  async getDocuments(tenantId: string, clientId: string, operationId: string): Promise<Document[]> {
    await this.getOperation(tenantId, clientId, operationId);
    return this.documents.find({
      where: { tenantId, operationId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Facturas del cliente (US4.2). */
  listInvoices(tenantId: string, clientId: string): Promise<Invoice[]> {
    return this.invoices.find({
      where: { tenantId, clientId },
      order: { createdAt: 'DESC' },
    });
  }

  async getInvoiceLines(tenantId: string, clientId: string, invoiceId: string): Promise<InvoiceLine[]> {
    const invoice = await this.invoices.findOne({ where: { tenantId, clientId, id: invoiceId } });
    if (!invoice) {
      throw new NotFoundException('Factura no encontrada');
    }
    return this.invoiceLines.find({ where: { tenantId, invoiceId } });
  }
}
