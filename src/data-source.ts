import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { baseConnectionOptions } from './common/database/data-source-options';

/**
 * DataSource para el CLI de TypeORM (generar y correr migraciones).
 *
 *   npm run build
 *   npm run migration:generate --name=NombreMigracion   # diff entidades vs BD
 *   npm run migration:run                                # aplica pendientes
 *
 * Usa las variables de entorno (DATABASE_URL o DATABASE_HOST/…); en local,
 * expórtalas antes de correr el CLI. Compilado, __dirname = dist, así que los
 * globs resuelven a dist/**\/*.entity.js y dist/migrations/*.js.
 */
export default new DataSource({
  ...baseConnectionOptions(),
  entities: [__dirname + '/**/*.entity.{js,ts}'],
  migrations: [__dirname + '/migrations/*.{js,ts}'],
});
