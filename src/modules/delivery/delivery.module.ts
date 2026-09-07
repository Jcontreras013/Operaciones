import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@modules/clients/clients.module';
import { Vehicle } from './entities/vehicle.entity';
import { Carrier } from './entities/carrier.entity';
import { Route } from './entities/route.entity';
import { Delivery } from './entities/delivery.entity';
import { FleetService } from './fleet.service';
import { DeliveryService } from './delivery.service';
import { DeliveryController } from './delivery.controller';
import { ROUTE_OPTIMIZER } from './routing/route-optimizer';
import { NearestNeighborOptimizer } from './routing/nearest-neighbor.optimizer';

@Module({
  imports: [
    TypeOrmModule.forFeature([Vehicle, Carrier, Route, Delivery]),
    ClientsModule,
  ],
  providers: [
    FleetService,
    DeliveryService,
    // Optimizador de rutas de la Fase 1. Sustituir por SimpliRoute/Locus/etc.
    // cambiando solo este proveedor.
    { provide: ROUTE_OPTIMIZER, useClass: NearestNeighborOptimizer },
  ],
  controllers: [DeliveryController],
  exports: [DeliveryService, FleetService],
})
export class DeliveryModule {}
