import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { TenantContext } from '@common/tenant/tenant-context';
import { UserRole } from '@modules/tenancy/entities/user.entity';

function fakeContext(): ExecutionContext {
  return {
    getHandler: () => ({}) as unknown,
    getClass: () => ({}) as unknown,
  } as ExecutionContext;
}

function guardWith(required: UserRole[] | undefined): RolesGuard {
  const reflector = { getAllAndOverride: jest.fn().mockReturnValue(required) } as unknown as Reflector;
  return new RolesGuard(reflector);
}

function runAsRole<T>(role: UserRole | undefined, fn: () => T): T {
  return TenantContext.run({ tenantId: 't1', userId: 'u1', role }, fn);
}

describe('RolesGuard', () => {
  it('permite el acceso si la ruta no declara @Roles(...)', () => {
    const guard = guardWith(undefined);
    expect(runAsRole(undefined, () => guard.canActivate(fakeContext()))).toBe(true);
  });

  it('permite el acceso si la ruta declara @Roles([]) vacío', () => {
    const guard = guardWith([]);
    expect(runAsRole(UserRole.LLAMADOS, () => guard.canActivate(fakeContext()))).toBe(true);
  });

  it('permite el acceso si el rol del contexto está en la lista requerida', () => {
    const guard = guardWith([UserRole.ADMIN, UserRole.JEFE]);
    expect(runAsRole(UserRole.JEFE, () => guard.canActivate(fakeContext()))).toBe(
      true,
    );
  });

  it('rechaza con ForbiddenException si el rol no está en la lista', () => {
    const guard = guardWith([UserRole.ADMIN, UserRole.JEFE]);
    expect(() =>
      runAsRole(UserRole.LLAMADOS, () => guard.canActivate(fakeContext())),
    ).toThrow(ForbiddenException);
  });

  it('rechaza si no hay rol en el contexto y la ruta sí lo exige', () => {
    const guard = guardWith([UserRole.ADMIN]);
    expect(() => runAsRole(undefined, () => guard.canActivate(fakeContext()))).toThrow(
      ForbiddenException,
    );
  });

  it('no da acceso implícito a ADMIN si no está en la lista requerida', () => {
    const guard = guardWith([UserRole.LLAMADOS]);
    expect(() =>
      runAsRole(UserRole.ADMIN, () => guard.canActivate(fakeContext())),
    ).toThrow(ForbiddenException);
  });
});
