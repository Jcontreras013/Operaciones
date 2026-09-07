import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { OperatorClaims, PortalClaims, TokenClaims } from './claims';

/**
 * Firma y verifica los JWT de la Fase 0. Los middlewares de tenant y de portal
 * dependen solo de esto para resolver la identidad del request.
 */
@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}

  signOperator(claims: Omit<OperatorClaims, 'typ'>): string {
    return this.jwt.sign({ ...claims, typ: 'operator' } satisfies OperatorClaims);
  }

  signPortal(claims: Omit<PortalClaims, 'typ'>): string {
    return this.jwt.sign({ ...claims, typ: 'portal' } satisfies PortalClaims);
  }

  /** Verifica el token y devuelve sus claims, o lanza 401. */
  verify(token: string): TokenClaims {
    try {
      return this.jwt.verify<TokenClaims>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o expirado');
    }
  }

  /** Extrae el token del header Authorization: Bearer <token>. */
  extractBearer(header: string | undefined): string {
    if (!header || !header.startsWith('Bearer ')) {
      throw new UnauthorizedException('Falta el header Authorization: Bearer <token>');
    }
    return header.slice('Bearer '.length).trim();
  }
}
