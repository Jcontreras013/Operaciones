import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OutboxEvent } from './outbox-event.entity';
import { EventsService } from './events.service';

/**
 * Módulo global: cualquier dominio puede inyectar EventsService para publicar
 * eventos sin importar explícitamente este módulo.
 */
@Global()
@Module({
  imports: [TypeOrmModule.forFeature([OutboxEvent])],
  providers: [EventsService],
  exports: [EventsService],
})
export class EventsModule {}
