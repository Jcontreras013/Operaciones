import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Password } from '@common/password';
import { Tenant } from '@modules/tenancy/entities/tenant.entity';
import { User } from '@modules/tenancy/entities/user.entity';
import { ClientUser } from '@modules/clients/client-user.entity';
import { TokenService } from './token.service';
import { LoginDto } from './dto/login.dto';

export interface LoginResult {
  accessToken: string;
  tokenType: 'Bearer';
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(ClientUser) private readonly clientUsers: Repository<ClientUser>,
    private readonly tokens: TokenService,
  ) {}

  /** Login de usuario del operador. Devuelve un JWT de tipo 'operator'. */
  async loginOperator(dto: LoginDto): Promise<LoginResult> {
    const tenant = await this.tenants.findOne({ where: { slug: dto.tenantSlug, active: true } });
    if (!tenant) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    // passwordHash es select:false, hay que pedirlo explícitamente.
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.tenantId = :tenantId AND u.email = :email AND u.active = true', {
        tenantId: tenant.id,
        email: dto.email,
      })
      .getOne();
    if (!user || !user.passwordHash || !(await Password.verify(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return {
      accessToken: this.tokens.signOperator({ sub: user.id, tenantId: tenant.id, role: user.role }),
      tokenType: 'Bearer',
    };
  }

  /** Login de usuario de cliente (portal). Devuelve un JWT de tipo 'portal'. */
  async loginClient(dto: LoginDto): Promise<LoginResult> {
    const tenant = await this.tenants.findOne({ where: { slug: dto.tenantSlug, active: true } });
    if (!tenant) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    const user = await this.clientUsers
      .createQueryBuilder('cu')
      .addSelect('cu.passwordHash')
      .where('cu.tenantId = :tenantId AND cu.email = :email AND cu.active = true', {
        tenantId: tenant.id,
        email: dto.email,
      })
      .getOne();
    if (!user || !user.passwordHash || !(await Password.verify(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Credenciales inválidas');
    }
    return {
      accessToken: this.tokens.signPortal({
        sub: user.id,
        tenantId: tenant.id,
        clientId: user.clientId,
      }),
      tokenType: 'Bearer',
    };
  }
}
