import { Body, Controller, HttpCode, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

/** Rutas públicas de autenticación (no requieren token). */
@ApiTags('Auth')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  /** Login del operador. Devuelve un access token Bearer. */
  @Post('v1/auth/login')
  @HttpCode(200)
  loginOperator(@Body() dto: LoginDto) {
    return this.auth.loginOperator(dto);
  }

  /** Login del portal de cliente. Devuelve un access token Bearer. */
  @Post('portal/auth/login')
  @HttpCode(200)
  loginClient(@Body() dto: LoginDto) {
    return this.auth.loginClient(dto);
  }
}
