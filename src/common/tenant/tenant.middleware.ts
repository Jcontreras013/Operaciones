import { BadRequestException, Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { TenantContext } from './tenant-context';

/**
 * Resuelve el tenant del request y lo fija en el TenantContext.
 *
 * Fase 0: el tenant llega en el header `x-tenant-id`. Cuando se agregue auth
 * real (OAuth2/OIDC, épica E1), el tenantId se derivará del token en vez del
 * header, sin tocar el resto de la aplicación.
 *
 * Las rutas públicas (health, alta de tenant) se excluyen en AppModule.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const header = req.header('x-tenant-id');
    if (!header) {
      throw new BadRequestException('Falta el header x-tenant-id');
    }
    TenantContext.run({ tenantId: header }, () => next());
  }
}
