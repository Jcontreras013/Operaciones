import { QueryClient, QueryCache, MutationCache } from '@tanstack/react-query';
import { ApiError, setToken } from '@/api/client';

/** Si cualquier request devuelve 401, la sesión expiró: limpiar y volver al login. */
function handleUnauthorized(error: unknown): void {
  if (error instanceof ApiError && error.status === 401) {
    setToken(null);
    if (window.location.pathname !== '/login') {
      window.location.assign('/login');
    }
  }
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({ onError: handleUnauthorized }),
  mutationCache: new MutationCache({ onError: handleUnauthorized }),
  defaultOptions: {
    queries: {
      retry: (count, error) => !(error instanceof ApiError) && count < 2,
      staleTime: 10_000,
      refetchOnWindowFocus: false,
    },
  },
});
