import { UserRole } from '@modules/tenancy/entities/user.entity';

/** Tipo de sujeto del token: operador o usuario de portal. */
export type TokenType = 'operator' | 'portal';

/** Claims de un token de operador. `sub` = id del User. */
export interface OperatorClaims {
  sub: string;
  tenantId: string;
  role: UserRole;
  /** Login del usuario (email o nombre corto) — para reglas por persona (ej. acceso a Expedientes). */
  email: string;
  typ: 'operator';
}

/** Claims de un token de portal. `sub` = id del ClientUser. */
export interface PortalClaims {
  sub: string;
  tenantId: string;
  clientId: string;
  typ: 'portal';
}

export type TokenClaims = OperatorClaims | PortalClaims;
