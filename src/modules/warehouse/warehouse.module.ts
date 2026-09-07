import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@modules/clients/clients.module';
import { Warehouse } from './entities/warehouse.entity';
import { Location } from './entities/location.entity';
import { StockItem } from './entities/stock-item.entity';
import { StockMovement } from './entities/stock-movement.entity';
import { WarehouseService } from './warehouse.service';
import { InventoryService } from './inventory.service';
import { WarehouseController } from './warehouse.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Warehouse, Location, StockItem, StockMovement]),
    ClientsModule,
  ],
  providers: [WarehouseService, InventoryService],
  controllers: [WarehouseController],
  exports: [WarehouseService, InventoryService],
})
export class WarehouseModule {}
