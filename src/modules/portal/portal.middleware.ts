import { Injectable, NestMiddleware, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { NextFunction, Request, Response } from 'express';
import { Repository } from 'typeorm';
import { ClientUser } from '@modules/clients/client-user.entity';
import { PortalContext } from './portal-context';

/**
 * Autentica al usuario de cliente y fija el PortalContext.
 *
 * Fase 0: el usuario de cliente llega en el header `x-client-user-id`. El
 * middleware carga el ClientUser y DERIVA de él tenantId y clientId — el
 * request nunca los provee. Cuando llegue la auth real (E6), el clientUserId
 * saldrá del token y este middleware no cambia su contrato.
 */
@Injectable()
export class PortalMiddleware implements NestMiddleware {
  constructor(
    @InjectRepository(ClientUser) private readonly clientUsers: Repository<ClientUser>,
  ) {}

  async use(req: Request, _res: Response, next: NextFunction): Promise<void> {
    const clientUserId = req.header('x-client-user-id');
    if (!clientUserId) {
      throw new UnauthorizedException('Falta el header x-client-user-id');
    }

    const user = await this.clientUsers.findOne({ where: { id: clientUserId, active: true } });
    if (!user) {
      throw new UnauthorizedException('Usuario de cliente inválido o inactivo');
    }

    PortalContext.run(
      { tenantId: user.tenantId, clientId: user.clientId, clientUserId: user.id },
      () => next(),
    );
  }
}
