import { Password } from './password';

describe('Password', () => {
  it('genera un hash verificable y rechaza la contraseña incorrecta', async () => {
    const hash = await Password.hash('secreta123');
    expect(hash).not.toBe('secreta123'); // nunca en texto plano
    expect(await Password.verify('secreta123', hash)).toBe(true);
    expect(await Password.verify('otra', hash)).toBe(false);
  });
});
