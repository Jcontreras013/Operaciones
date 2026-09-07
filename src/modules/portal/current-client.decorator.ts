import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { PortalContext, PortalStore } from './portal-context';

/** Inyecta el contexto del cliente autenticado en un handler del portal. */
export const CurrentClient = createParamDecorator(
  (_data: unknown, _ctx: ExecutionContext): PortalStore => PortalContext.require(),
);
