import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TokenService } from '@modules/auth/token.service';
import { PortalContext } from './portal-context';

/**
 * Autentica al usuario de cliente con un JWT (E6) y fija el PortalContext.
 *
 * Exige un token de tipo 'portal' y DERIVA tenantId y clientId de los claims —
 * el request nunca los provee. Así cada cliente ve solo lo suyo.
 */
@Injectable()
export class PortalMiddleware implements NestMiddleware {
  constructor(private readonly tokens: TokenService) {}

  use(req: Request, _res: Response, next: NextFunction): void {
    const token = this.tokens.extractBearer(req.header('authorization'));
    const claims = this.tokens.verify(token);
    if (claims.typ !== 'portal') {
      throw new UnauthorizedException('Se requiere un token de portal');
    }
    PortalContext.run(
      { tenantId: claims.tenantId, clientId: claims.clientId, clientUserId: claims.sub },
      () => next(),
    );
  }
}
