import * as bcrypt from 'bcryptjs';

const ROUNDS = 10;

/** Utilidades de hashing de contraseñas (bcrypt). Nunca guardar texto plano. */
export const Password = {
  hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, ROUNDS);
  },
  verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  },
};
