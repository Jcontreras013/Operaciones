/**
 * Utilidades de dinero en la menor unidad de la moneda (ej. centavos),
 * representada como string para preservar precisión (los montos se guardan
 * como bigint en PostgreSQL). Nunca usar float para dinero.
 */
export const Money = {
  /** rate × cantidad, ambos en enteros; devuelve string. */
  multiply(rateMinor: string | number, quantity: number): string {
    return (BigInt(rateMinor) * BigInt(quantity)).toString();
  },

  /** Suma una lista de montos (strings) y devuelve string. */
  sum(amounts: string[]): string {
    return amounts.reduce((acc, a) => acc + BigInt(a), 0n).toString();
  },
};
