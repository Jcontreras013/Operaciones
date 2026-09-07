import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

/** Alta de operador (US1.1). Crea el tenant y su primer usuario admin. */
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

  @IsEmail()
  adminEmail!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  adminName?: string;
}
