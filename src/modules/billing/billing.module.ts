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
import { BillingService } from './billing.service';
import { ChargeEngine } from './charge-engine.service';
import { BillingController } from './billing.controller';

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
    ]),
    OperationsModule,
  ],
  providers: [BillingService, ChargeEngine],
  controllers: [BillingController],
  exports: [BillingService],
})
export class BillingModule {}
