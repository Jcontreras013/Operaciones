import { IsString, IsEnum, MaxLength, MinLength } from 'class-validator';
import { UserRole } from '../entities/user.entity';

/**
 * Alta de usuario del operador (US1.1).
 *
 * `email` es el identificador de login (único por tenant) — admite un
 * correo real o un usuario corto (p. ej. "jaison"), según prefiera el
 * tenant.
 */
export class CreateUserDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  password!: string;
}
