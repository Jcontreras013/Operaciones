import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/**
 * Alta de operador (US1.1). Crea el tenant y su primer usuario admin.
 *
 * `adminEmail` es el identificador de login del admin (único por tenant) —
 * admite un correo real o un usuario corto (p. ej. "jaison"), igual que
 * `LoginDto`/`CreateUserDto`.
 */
export class CreateTenantDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'slug solo admite minúsculas, números y guiones',
  })
  @MinLength(2)
  @MaxLength(60)
  slug!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminEmail!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  adminPassword!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  adminName?: string;
}
