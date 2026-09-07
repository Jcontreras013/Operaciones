import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Operation } from '@modules/operations/entities/operation.entity';
import { Document } from '@modules/operations/entities/document.entity';
import { CostItem } from '@modules/operations/entities/cost-item.entity';
import { ChargeItem } from '@modules/billing/entities/charge-item.entity';
import { VisibilityService } from './visibility.service';
import { VisibilityController } from './visibility.controller';

/**
 * Módulo de lectura (read model). Registra las entidades que consulta —
 * compartidas con los módulos que las poseen — sin escribir estado de negocio.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Operation, Document, CostItem, ChargeItem])],
  providers: [VisibilityService],
  controllers: [VisibilityController],
})
export class VisibilityModule {}
