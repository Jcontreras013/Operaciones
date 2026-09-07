import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from '@common/database/database.module';
import { TenantMiddleware } from '@common/tenant/tenant.middleware';
import { EventsModule } from '@modules/events/events.module';
import { TenancyModule } from '@modules/tenancy/tenancy.module';
import { ClientsModule } from '@modules/clients/clients.module';
import { OperationsModule } from '@modules/operations/operations.module';
import { BillingModule } from '@modules/billing/billing.module';
import { VisibilityModule } from '@modules/visibility/visibility.module';
import { WarehouseModule } from '@modules/warehouse/warehouse.module';
import { DeliveryModule } from '@modules/delivery/delivery.module';
import { PortalModule } from '@modules/portal/portal.module';
import { AuthModule } from '@modules/auth/auth.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    DatabaseModule,
    AuthModule,
    EventsModule,
    TenancyModule,
    ClientsModule,
    OperationsModule,
    BillingModule,
    VisibilityModule,
    WarehouseModule,
    DeliveryModule,
    PortalModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  /**
   * El TenantMiddleware exige x-tenant-id en todas las rutas salvo:
   *  - health y el alta de operador (rutas públicas sin tenant),
   *  - el portal, que tiene su propia autenticación (PortalMiddleware).
   */
  configure(consumer: MiddlewareConsumer): void {
    consumer
      .apply(TenantMiddleware)
      .exclude(
        { path: 'health', method: RequestMethod.ALL },
        { path: 'v1/tenants', method: RequestMethod.POST },
        { path: 'v1/auth/login', method: RequestMethod.POST },
        { path: 'portal', method: RequestMethod.ALL },
        { path: 'portal/(.*)', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
