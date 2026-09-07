import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Tenant } from '@modules/tenancy/entities/tenant.entity';
import { User } from '@modules/tenancy/entities/user.entity';
import { ClientUser } from '@modules/clients/client-user.entity';
import { TokenService } from './token.service';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

/**
 * Módulo de autenticación (E6). Global para que los middlewares de tenant y de
 * portal puedan inyectar TokenService y verificar los JWT.
 */
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Tenant, User, ClientUser]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'dev-secret-cambiar-en-produccion'),
        signOptions: { expiresIn: config.get<string>('JWT_EXPIRES_IN', '1h') },
      }),
    }),
  ],
  providers: [TokenService, AuthService],
  controllers: [AuthController],
  exports: [TokenService, AuthService],
})
export class AuthModule {}
