import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

/** Alta de usuario del cliente para el portal (US1.4). */
export class CreateClientUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;
}
