import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from '@modules/field/entities/work-order.entity';
import { QualitySurvey } from './entities/quality-survey.entity';
import { QualityService } from './quality.service';
import { QualityController } from './quality.controller';

/**
 * Módulo de calidad (Fase D de la migración del monitor): encuesta de
 * control post-servicio, CSAT oficial y diagnóstico por pregunta. Depende
 * de `WorkOrder` (field) solo para leer los datos auto-rellenados al crear
 * una encuesta — no hay dependencia inversa.
 */
@Module({
  imports: [TypeOrmModule.forFeature([QualitySurvey, WorkOrder])],
  providers: [QualityService],
  controllers: [QualityController],
  exports: [QualityService],
})
export class QualityModule {}
