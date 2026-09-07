import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TokenService } from '@modules/auth/token.service';
import { TenantContext } from './tenant-context';

/**
 * Autentica al usuario del operador con un JWT (E6) y fija el TenantContext.
 *
 * Valida el header `Authorization: Bearer <token>`, exige un token de tipo
 * 'operator' y DERIVA el tenantId (y usuario/rol) de los claims — ya no se
 * confía en un header con el tenantId. Las rutas públicas (health, alta de
 * operador, login) se excluyen en AppModule.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(private readonly tokens: TokenService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = this.tokens.extractBearer(req.header('authorization'));
    const claims = this.tokens.verify(token);
    if (claims.typ !== 'operator') {
      throw new UnauthorizedException('Se requiere un token de operador');
    }
    TenantContext.run(
      { tenantId: claims.tenantId, userId: claims.sub, role: claims.role },
      () => next(),
    );
  }
}
