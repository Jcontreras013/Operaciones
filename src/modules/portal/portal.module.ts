import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operation } from '@modules/operations/entities/operation.entity';
import { Milestone } from '@modules/operations/entities/milestone.entity';
import { Document } from '@modules/operations/entities/document.entity';
import { Invoice } from '@modules/billing/entities/invoice.entity';
import { InvoiceLine } from '@modules/billing/entities/invoice-line.entity';
import { ClientUser } from '@modules/clients/client-user.entity';
import { PortalService } from './portal.service';
import { PortalController } from './portal.controller';
import { PortalMiddleware } from './portal.middleware';

/**
 * Portal de cliente (E4). Read model con su propia autenticación: el
 * PortalMiddleware resuelve el usuario de cliente y fija el PortalContext antes
 * de cada handler.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Operation, Milestone, Document, Invoice, InvoiceLine, ClientUser]),
  ],
  providers: [PortalService],
  controllers: [PortalController],
})
export class PortalModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(PortalMiddleware).forRoutes(PortalController);
  }
}
