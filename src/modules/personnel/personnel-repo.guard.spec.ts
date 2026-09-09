import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PersonnelRepoGuard } from './personnel-repo.guard';
import { TenantContext } from '@common/tenant/tenant-context';

function fakeContext(): ExecutionContext {
  return {} as ExecutionContext;
}

function runAsEmail<T>(email: string | undefined, fn: () => T): T {
  return TenantContext.run({ tenantId: 't1', userId: 'u1', role: 'admin', email }, fn);
}

describe('PersonnelRepoGuard', () => {
  const guard = new PersonnelRepoGuard();

  it('permite el acceso a los usuarios exactos autorizados', () => {
    expect(runAsEmail('jaison', () => guard.canActivate(fakeContext()))).toBe(true);
    expect(runAsEmail('oscar', () => guard.canActivate(fakeContext()))).toBe(true);
    expect(runAsEmail('afajardo', () => guard.canActivate(fakeContext()))).toBe(true);
  });

  it('la comparación no distingue mayúsculas/espacios', () => {
    expect(runAsEmail(' Jaison ', () => guard.canActivate(fakeContext()))).toBe(true);
  });

  it('rechaza a cualquier otro usuario, sin importar su rol', () => {
    expect(() => runAsEmail('harin', () => guard.canActivate(fakeContext()))).toThrow(ForbiddenException);
    expect(() => runAsEmail('sac', () => guard.canActivate(fakeContext()))).toThrow(ForbiddenException);
  });

  it('rechaza si no hay usuario en el contexto', () => {
    expect(() => runAsEmail(undefined, () => guard.canActivate(fakeContext()))).toThrow(ForbiddenException);
  });
});
