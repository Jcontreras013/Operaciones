import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from './entities/warehouse.entity';
import { Location } from './entities/location.entity';
import { LocationKind } from './warehouse.enums';
import { CreateWarehouseDto } from './dto/create-warehouse.dto';
import { CreateLocationDto } from './dto/create-location.dto';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse) private readonly warehouses: Repository<Warehouse>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
  ) {}

  async createWarehouse(tenantId: string, dto: CreateWarehouseDto): Promise<Warehouse> {
    const dup = await this.warehouses.findOne({ where: { tenantId, code: dto.code } });
    if (dup) {
      throw new ConflictException(`Ya existe un almacén con código "${dto.code}"`);
    }
    return this.warehouses.save({
      tenantId,
      code: dto.code,
      name: dto.name,
      address: dto.address ?? null,
      active: true,
    });
  }

  listWarehouses(tenantId: string): Promise<Warehouse[]> {
    return this.warehouses.find({ where: { tenantId }, order: { code: 'ASC' } });
  }

  async getWarehouse(tenantId: string, id: string): Promise<Warehouse> {
    const warehouse = await this.warehouses.findOne({ where: { tenantId, id } });
    if (!warehouse) {
      throw new NotFoundException('Almacén no encontrado');
    }
    return warehouse;
  }

  async createLocation(
    tenantId: string,
    warehouseId: string,
    dto: CreateLocationDto,
  ): Promise<Location> {
    await this.getWarehouse(tenantId, warehouseId);
    const dup = await this.locations.findOne({ where: { warehouseId, code: dto.code } });
    if (dup) {
      throw new ConflictException(`Ya existe una ubicación "${dto.code}" en este almacén`);
    }
    return this.locations.save({
      tenantId,
      warehouseId,
      code: dto.code,
      kind: dto.kind ?? LocationKind.STORAGE,
      active: true,
    });
  }

  listLocations(tenantId: string, warehouseId: string): Promise<Location[]> {
    return this.locations.find({ where: { tenantId, warehouseId }, order: { code: 'ASC' } });
  }

  /** Devuelve la ubicación validando que pertenezca al almacén y al tenant. */
  async getLocation(tenantId: string, warehouseId: string, id: string): Promise<Location> {
    const location = await this.locations.findOne({ where: { tenantId, warehouseId, id } });
    if (!location) {
      throw new NotFoundException('Ubicación no encontrada en este almacén');
    }
    return location;
  }
}
