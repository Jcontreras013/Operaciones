import { DataSourceOptions } from 'typeorm';

/**
 * Construye la configuración de conexión a PostgreSQL desde variables de
 * entorno. La comparten la app (DatabaseModule) y el CLI de migraciones
 * (data-source.ts), para que no haya deriva entre ambos.
 *
 * - `DATABASE_URL` (formato Supabase/Postgres) tiene prioridad; si no, se usan
 *   las variables discretas DATABASE_HOST/PORT/USER/PASSWORD/NAME.
 * - `DATABASE_SSL=true` habilita SSL (requerido por Supabase y la mayoría de
 *   proveedores gestionados).
 */
export function baseConnectionOptions(): DataSourceOptions {
  const ssl = process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined;
  const common = {
    type: 'postgres' as const,
    ssl,
    logging: process.env.DATABASE_LOGGING === 'true',
  };

  const url = process.env.DATABASE_URL;
  if (url) {
    return { ...common, url } as DataSourceOptions;
  }

  return {
    ...common,
    host: process.env.DATABASE_HOST ?? 'localhost',
    port: Number(process.env.DATABASE_PORT ?? 5432),
    username: process.env.DATABASE_USER ?? 'operaciones',
    password: process.env.DATABASE_PASSWORD ?? '',
    database: process.env.DATABASE_NAME ?? 'operaciones',
  } as DataSourceOptions;
}
