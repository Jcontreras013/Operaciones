import { TenantContext } from './tenant-context';

describe('TenantContext', () => {
  it('devuelve el tenantId dentro de run()', () => {
    TenantContext.run({ tenantId: 'tenant-a' }, () => {
      expect(TenantContext.getTenantId()).toBe('tenant-a');
      expect(TenantContext.requireTenantId()).toBe('tenant-a');
    });
  });

  it('aísla contextos concurrentes', async () => {
    const seen: string[] = [];
    await Promise.all([
      new Promise<void>((resolve) =>
        TenantContext.run({ tenantId: 'a' }, () => {
          setTimeout(() => {
            seen.push(TenantContext.requireTenantId());
            resolve();
          }, 10);
        }),
      ),
      new Promise<void>((resolve) =>
        TenantContext.run({ tenantId: 'b' }, () => {
          setTimeout(() => {
            seen.push(TenantContext.requireTenantId());
            resolve();
          }, 5);
        }),
      ),
    ]);
    expect(seen.sort()).toEqual(['a', 'b']);
  });

  it('no hay tenantId fuera de run()', () => {
    expect(TenantContext.getTenantId()).toBeUndefined();
    expect(() => TenantContext.requireTenantId()).toThrow();
  });
});
