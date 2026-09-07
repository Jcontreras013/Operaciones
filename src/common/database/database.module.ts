import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { baseConnectionOptions } from './data-source-options';

/**
 * Configura la conexión a PostgreSQL.
 *
 * `autoLoadEntities` recoge las entidades registradas por cada módulo con
 * `TypeOrmModule.forFeature(...)`, de modo que el modular monolith mantiene
 * sus dominios separados sin una lista central de entidades.
 *
 * Producción: `synchronize` en false y las migraciones (dist/migrations) se
 * aplican al arrancar si `DATABASE_MIGRATIONS_RUN=true`. Desarrollo:
 * `DATABASE_SYNCHRONIZE=true` crea el esquema desde las entidades.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: () => ({
        ...baseConnectionOptions(),
        autoLoadEntities: true,
        synchronize: process.env.DATABASE_SYNCHRONIZE === 'true',
        migrations: ['dist/migrations/*.js'],
        migrationsRun: process.env.DATABASE_MIGRATIONS_RUN === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
