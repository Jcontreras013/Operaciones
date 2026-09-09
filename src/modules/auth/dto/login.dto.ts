import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Login de operador o de portal: identifica el operador por su slug.
 *
 * `email` es el identificador de login (columna `email` en `User`/`ClientUser`,
 * única por tenant) — históricamente un correo, pero admite cualquier
 * usuario corto (p. ej. "jaison") para tenants que prefieren no pedir email,
 * como el equipo que viene de monitor-operativo.
 */
export class LoginDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(60)
  tenantSlug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(200)
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
