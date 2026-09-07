import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

/**
 * Configura la conexión a PostgreSQL desde variables de entorno.
 *
 * `autoLoadEntities` recoge las entidades registradas por cada módulo con
 * `TypeOrmModule.forFeature(...)`, de modo que el modular monolith mantiene
 * sus dominios separados sin una lista central de entidades.
 */
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('DATABASE_HOST', 'localhost'),
        port: config.get<number>('DATABASE_PORT', 5432),
        username: config.get<string>('DATABASE_USER', 'operaciones'),
        password: config.get<string>('DATABASE_PASSWORD', 'changeme'),
        database: config.get<string>('DATABASE_NAME', 'operaciones'),
        autoLoadEntities: true,
        // Solo en desarrollo. En producción: migraciones.
        synchronize: config.get<string>('DATABASE_SYNCHRONIZE', 'false') === 'true',
        logging: config.get<string>('DATABASE_LOGGING', 'false') === 'true',
      }),
    }),
  ],
})
export class DatabaseModule {}
