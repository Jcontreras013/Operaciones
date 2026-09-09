import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@modules/tenancy/entities/user.entity';
import { TenantContext } from '@common/tenant/tenant-context';
import { ROLES_KEY } from './roles.decorator';

/**
 * Autorización por rol. Complementa a `TenantMiddleware` (que ya autentica y
 * pone el rol del token en `TenantContext`) — este guard solo decide si ESE
 * rol puede entrar a ESTA ruta, según lo que declare `@Roles(...)` en ella.
 *
 * Una ruta sin `@Roles(...)` no queda restringida: agregar
 * `@UseGuards(RolesGuard)` a un controlador no cambia nada por sí solo, hay
 * que decorar cada endpoint explícitamente.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;

    const role = TenantContext.getRole() as UserRole | undefined;
    if (role && required.includes(role)) return true;

    throw new ForbiddenException('Tu rol no tiene acceso a este módulo');
  }
}
