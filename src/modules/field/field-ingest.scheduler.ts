import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';
import { Repository } from 'typeorm';
import { Tenant } from '@modules/tenancy/entities/tenant.entity';
import { FieldIngestService } from './field-ingest.service';

/**
 * Reemplaza al `sync_job.py` del monitor original: ingiere Cepheus para
 * todos los tenants activos sin depender de que alguien pulse "Sincronizar
 * ahora". Sin esto, una orden que sale de la ventana rodante de Cepheus
 * antes de ingerirse se pierde para siempre — la ingesta manual sola no
 * garantiza "siempre voy a poder ver el histórico".
 *
 * El cron y la ventana se leen de env var en `onModuleInit` (no como
 * argumento de `@Cron(...)`, que se evalúa al cargar el módulo, antes de
 * que corran las variables de entorno del proceso en algunos arranques).
 */
@Injectable()
export class FieldIngestScheduler implements OnModuleInit {
  private readonly logger = new Logger(FieldIngestScheduler.name);
  static readonly JOB_NAME = 'field-ingest-programada';

  constructor(
    private readonly ingest: FieldIngestService,
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit(): void {
    // Por defecto, cada hora -- Cepheus limita a 5 consultas/hora
    // compartidas, así que una corrida por hora deja margen para las
    // sincronizaciones manuales del día sin agotar el cupo.
    const expr = process.env.CEPHEUS_SYNC_CRON ?? '0 * * * *';
    const job = new CronJob(expr, () => {
      this.ingestarTodosLosTenants().catch((err) =>
        this.logger.error(`Ingesta programada falló: ${err instanceof Error ? err.message : err}`),
      );
    });
    this.scheduler.addCronJob(FieldIngestScheduler.JOB_NAME, job);
    job.start();
    this.logger.log(`Ingesta programada de Cepheus activa (cron: "${expr}").`);
  }

  private async ingestarTodosLosTenants(): Promise<void> {
    const activos = await this.tenants.find({ where: { active: true } });
    // Ventana con margen (no solo desde la última corrida): una corrida que
    // falla o se atrasa no debe dejar un hueco silencioso en el histórico.
    const ventanaHoras = Number(process.env.CEPHEUS_SYNC_VENTANA_HORAS ?? 3);
    const from = new Date(Date.now() - ventanaHoras * 60 * 60 * 1000);

    for (const tenant of activos) {
      try {
        const res = await this.ingest.ingest(tenant.id, from);
        this.logger.log(
          `Ingesta programada [${tenant.slug}]: ${res.fetched} descargadas, ` +
            `${res.created} nuevas, ${res.updated} actualizadas.`,
        );
      } catch (err) {
        this.logger.error(
          `Ingesta programada falló para "${tenant.slug}": ${err instanceof Error ? err.message : err}`,
        );
      }
    }
  }
}
