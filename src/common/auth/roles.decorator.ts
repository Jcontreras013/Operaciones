import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@modules/tenancy/entities/user.entity';

export const ROLES_KEY = 'roles';

/**
 * Restringe una ruta a los roles listados. Sin `@Roles(...)`, `RolesGuard`
 * no restringe nada. No hay superusuario implícito: si ADMIN debe poder
 * entrar, hay que listarlo explícitamente (así es visible en cada endpoint
 * quién entra, sin adivinar una regla global).
 *
 *   @Roles(UserRole.ADMIN, UserRole.JEFE)
 *   @Get('reporte')
 *   reporte() { ... }
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
