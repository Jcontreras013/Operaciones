import { Money } from './money';

describe('Money', () => {
  it('multiplica sin perder precisión con montos grandes', () => {
    // 180000 centavos × 12 = 2,160,000
    expect(Money.multiply('180000', 12)).toBe('2160000');
    expect(Money.multiply(2500, 3)).toBe('7500');
  });

  it('suma una lista de montos', () => {
    expect(Money.sum(['180000', '2500', '7500'])).toBe('190000');
    expect(Money.sum([])).toBe('0');
  });

  it('maneja montos que exceden Number.MAX_SAFE_INTEGER', () => {
    const big = '9007199254740993'; // MAX_SAFE_INTEGER + 2
    expect(Money.multiply(big, 2)).toBe('18014398509481986');
  });
});
