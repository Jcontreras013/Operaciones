import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClientsModule } from '@modules/clients/clients.module';
import { Operation } from './entities/operation.entity';
import { Milestone } from './entities/milestone.entity';
import { Document } from './entities/document.entity';
import { CostItem } from './entities/cost-item.entity';
import { OperationsService } from './operations.service';
import { OperationsController } from './operations.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([Operation, Milestone, Document, CostItem]),
    ClientsModule,
  ],
  providers: [OperationsService],
  controllers: [OperationsController],
  exports: [OperationsService],
})
export class OperationsModule {}
