import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OperationsModule } from '@modules/operations/operations.module';
import { CostItem } from '@modules/operations/entities/cost-item.entity';
import { RateCard } from './entities/rate-card.entity';
import { RateRule } from './entities/rate-rule.entity';
import { ChargeItem } from './entities/charge-item.entity';
import { Invoice } from './entities/invoice.entity';
import { InvoiceLine } from './entities/invoice-line.entity';
import { CarrierInvoice } from './entities/carrier-invoice.entity';
import { CarrierInvoiceLine } from './entities/carrier-invoice-line.entity';
import { InvoiceExport } from './entities/invoice-export.entity';
import { BillingService } from './billing.service';
import { ChargeEngine } from './charge-engine.service';
import { BillingController } from './billing.controller';
import { ERP_CONNECTOR } from './erp/erp-connector';
import { StubErpConnector } from './erp/stub-erp.connector';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RateCard,
      RateRule,
      ChargeItem,
      Invoice,
      InvoiceLine,
      CostItem,
      CarrierInvoice,
      CarrierInvoiceLine,
      InvoiceExport,
    ]),
    OperationsModule,
  ],
  providers: [
    BillingService,
    ChargeEngine,
    // Conector ERP de la Fase 0. Sustituir por un adaptador real cambiando
    // solo este proveedor (SAP/Oracle/…), sin tocar el servicio de facturación.
    { provide: ERP_CONNECTOR, useClass: StubErpConnector },
  ],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
