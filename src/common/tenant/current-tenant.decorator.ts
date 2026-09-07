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
