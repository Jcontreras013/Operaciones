import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkOrder } from './entities/work-order.entity';
import { IngestRun } from './entities/ingest-run.entity';
import { FieldIngestService } from './field-ingest.service';
import { FieldController } from './field.controller';
import { CEPHEUS_CONNECTOR } from './cepheus/cepheus-connector';
import { StubCepheusConnector } from './cepheus/stub-cepheus.connector';

/**
 * Módulo de campo (Fase A de la migración del monitor): ingesta de órdenes
 * telecom desde Cepheus a PostgreSQL. El conector es enchufable — hoy un stub,
 * mañana el adaptador HTTP real (credenciales por env var).
 */
@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, IngestRun])],
  providers: [
    FieldIngestService,
    { provide: CEPHEUS_CONNECTOR, useClass: StubCepheusConnector },
  ],
  controllers: [FieldController],
  exports: [FieldIngestService],
})
export class FieldModule {}
