import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@modules/tenancy/entities/tenant.entity';
import { WorkOrder } from './entities/work-order.entity';
import { IngestRun } from './entities/ingest-run.entity';
import { FieldIngestService } from './field-ingest.service';
import { FieldIngestScheduler } from './field-ingest.scheduler';
import { FieldController } from './field.controller';
import { CEPHEUS_CONNECTOR } from './cepheus/cepheus-connector';
import { StubCepheusConnector } from './cepheus/stub-cepheus.connector';
import { HttpCepheusConnector } from './cepheus/http-cepheus.connector';

/**
 * Módulo de campo (migración del monitor): ingesta de órdenes telecom desde
 * Cepheus a PostgreSQL. El conector es enchufable: si `CEPHEUS_BASE_URL` está
 * configurada se usa el adaptador HTTP real (credenciales por env var, nunca
 * en el repo); si no, el stub con órdenes de ejemplo, para poder desarrollar
 * y probar el resto de la ingesta/monitor sin depender de la API real.
 *
 * `FieldIngestScheduler` corre la ingesta sola (reemplaza al `sync_job.py`
 * del monitor) — necesita `Tenant` para recorrer los tenants activos.
 */
@Module({
  imports: [TypeOrmModule.forFeature([WorkOrder, IngestRun, Tenant])],
  providers: [
    FieldIngestService,
    FieldIngestScheduler,
    {
      provide: CEPHEUS_CONNECTOR,
      useClass: process.env.CEPHEUS_BASE_URL ? HttpCepheusConnector : StubCepheusConnector,
    },
  ],
  controllers: [FieldController],
  exports: [FieldIngestService],
})
export class FieldModule {}
