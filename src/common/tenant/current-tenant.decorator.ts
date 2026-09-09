import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { TenantContext } from './tenant-context';

/**
 * Inyecta el tenantId del request en un handler de controlador.
 *
 *   @Get()
 *   list(@CurrentTenant() tenantId: string) { ... }
 */
export const CurrentTenant = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string => TenantContext.requireTenantId(),
);

/** Inyecta el id del usuario del operador autenticado (o undefined). */
export const CurrentUserId = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string | undefined => TenantContext.getUserId(),
);

/** Inyecta el rol del usuario del operador autenticado (o undefined). */
export const CurrentUserRole = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): string | undefined => TenantContext.getRole(),
);
