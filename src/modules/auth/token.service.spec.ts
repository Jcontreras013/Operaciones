import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { UserRole } from '@modules/tenancy/entities/user.entity';

describe('TokenService', () => {
  const jwt = new JwtService({ secret: 'test-secret', signOptions: { expiresIn: '1h' } });
  const tokens = new TokenService(jwt);

  it('firma y verifica un token de operador', () => {
    const token = tokens.signOperator({ sub: 'u1', tenantId: 't1', role: UserRole.ADMIN, email: 'jaison' });
    const claims = tokens.verify(token);
    expect(claims).toMatchObject({ sub: 'u1', tenantId: 't1', typ: 'operator', role: 'admin', email: 'jaison' });
  });

  it('firma y verifica un token de portal', () => {
    const token = tokens.signPortal({ sub: 'cu1', tenantId: 't1', clientId: 'c1' });
    const claims = tokens.verify(token);
    expect(claims).toMatchObject({ sub: 'cu1', tenantId: 't1', clientId: 'c1', typ: 'portal' });
  });

  it('rechaza un token inválido', () => {
    expect(() => tokens.verify('no-es-un-token')).toThrow(UnauthorizedException);
  });

  it('extrae el token del header Bearer y rechaza si falta', () => {
    expect(tokens.extractBearer('Bearer abc.def')).toBe('abc.def');
    expect(() => tokens.extractBearer(undefined)).toThrow(UnauthorizedException);
    expect(() => tokens.extractBearer('Basic xyz')).toThrow(UnauthorizedException);
  });
});
