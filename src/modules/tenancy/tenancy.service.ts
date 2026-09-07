import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Tenant } from './entities/tenant.entity';
import { User, UserRole } from './entities/user.entity';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class TenancyService {
  constructor(
    @InjectRepository(Tenant) private readonly tenants: Repository<Tenant>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Alta de operador (US1.1): crea el tenant y su primer usuario admin en una
   * sola transacción. Ruta pública — no requiere contexto de tenant previo.
   */
  async createTenant(dto: CreateTenantDto): Promise<Tenant> {
    const existing = await this.tenants.findOne({ where: { slug: dto.slug } });
    if (existing) {
      throw new ConflictException(`El slug "${dto.slug}" ya está en uso`);
    }

    return this.dataSource.transaction(async (manager) => {
      const tenant = await manager.getRepository(Tenant).save({
        name: dto.name,
        slug: dto.slug,
        active: true,
      });
      await manager.getRepository(User).save({
        tenantId: tenant.id,
        email: dto.adminEmail,
        name: dto.adminName ?? dto.adminEmail,
        role: UserRole.ADMIN,
        active: true,
      });
      return tenant;
    });
  }

  /** Agrega un usuario al operador actual (US1.1). */
  async addUser(tenantId: string, dto: CreateUserDto): Promise<User> {
    const dup = await this.users.findOne({ where: { tenantId, email: dto.email } });
    if (dup) {
      throw new ConflictException(`El email "${dto.email}" ya existe en este operador`);
    }
    return this.users.save({ tenantId, ...dto, active: true });
  }

  listUsers(tenantId: string): Promise<User[]> {
    return this.users.find({ where: { tenantId }, order: { createdAt: 'ASC' } });
  }

  async getTenant(tenantId: string): Promise<Tenant> {
    const tenant = await this.tenants.findOne({ where: { id: tenantId } });
    if (!tenant) {
      throw new NotFoundException('Operador no encontrado');
    }
    return tenant;
  }
}
