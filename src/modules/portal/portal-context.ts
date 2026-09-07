import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * Contexto del portal por request: quién es el cliente autenticado.
 *
 * A diferencia del operador (TenantContext), aquí el `clientId` se DERIVA del
 * usuario de cliente autenticado y nunca se acepta del request — esa es la
 * garantía de aislamiento del portal.
 */
export interface PortalStore {
  tenantId: string;
  clientId: string;
  clientUserId: string;
}

const storage = new AsyncLocalStorage<PortalStore>();

export const PortalContext = {
  run<T>(store: PortalStore, fn: () => T): T {
    return storage.run(store, fn);
  },

  get(): PortalStore | undefined {
    return storage.getStore();
  },

  require(): PortalStore {
    const store = storage.getStore();
    if (!store) {
      throw new Error('No hay contexto de portal en el request');
    }
    return store;
  },
};
