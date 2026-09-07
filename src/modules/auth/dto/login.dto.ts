import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Login de operador o de portal: identifica el operador por su slug. */
export class LoginDto {
  @IsString()
  @Matches(/^[a-z0-9-]+$/)
  @MaxLength(60)
  tenantSlug!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password!: string;
}
