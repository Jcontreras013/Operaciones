import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto de tenant por request, propagado con AsyncLocalStorage.
 *
 * Multi-tenancy desde el día 1 (principio de arquitectura de la Fase 0):
 * cada request resuelve su `tenantId` una sola vez (en el middleware) y todos
 * los servicios lo leen de aquí, en vez de recibirlo por parámetro en cada capa.
 *
 * En producción, esto se complementa con Row-Level Security en PostgreSQL para
 * que el aislamiento no dependa solo de la aplicación.
 */
export interface TenantStore {
  tenantId: string;
  /** Usuario del operador autenticado (del token). */
  userId?: string;
  /** Rol del usuario autenticado (del token). */
  role?: string;
}

const storage = new AsyncLocalStorage<TenantStore>();

export const TenantContext = {
  /** Ejecuta `fn` dentro de un contexto de tenant. */
  run<T>(store: TenantStore, fn: () => T): T {
    return storage.run(store, fn);
  },

  /** tenantId del request actual, o undefined si no hay contexto. */
  getTenantId(): string | undefined {
    return storage.getStore()?.tenantId;
  },

  /** tenantId del request actual; lanza si no hay contexto (uso interno). */
  requireTenantId(): string {
    const tenantId = storage.getStore()?.tenantId;
    if (!tenantId) {
      throw new Error('No hay tenant en el contexto del request');
    }
    return tenantId;
  },
};
