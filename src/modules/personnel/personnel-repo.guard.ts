import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { TenantContext } from '@common/tenant/tenant-context';

/**
 * Acceso al Repositorio de Documentos: igual que el monitor original
 * (USUARIOS_REPOSITORIO en expediente.py) — una lista de PERSONAS exactas,
 * no un rol. Documentos laborales sensibles: ni todo Admin ni todo Jefe
 * debe poder verlos, y alguien de Llamados sí puede si está en la lista.
 * Para cambiar quién entra, se edita esta lista.
 */
const USUARIOS_AUTORIZADOS = new Set(['jaison', 'oscar', 'afajardo']);

@Injectable()
export class PersonnelRepoGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    const email = (TenantContext.getEmail() ?? '').trim().toLowerCase();
    if (!USUARIOS_AUTORIZADOS.has(email)) {
      throw new ForbiddenException('No tienes acceso al repositorio de documentos');
    }
    return true;
  }
}
