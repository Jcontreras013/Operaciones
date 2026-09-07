import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vehicle } from './entities/vehicle.entity';
import { Carrier } from './entities/carrier.entity';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { CreateCarrierDto } from './dto/create-carrier.dto';

/** Recursos de reparto: flota propia (vehículos) y carriers tercerizados. */
@Injectable()
export class FleetService {
  constructor(
    @InjectRepository(Vehicle) private readonly vehicles: Repository<Vehicle>,
    @InjectRepository(Carrier) private readonly carriers: Repository<Carrier>,
  ) {}

  async createVehicle(tenantId: string, dto: CreateVehicleDto): Promise<Vehicle> {
    const dup = await this.vehicles.findOne({ where: { tenantId, plate: dto.plate } });
    if (dup) {
      throw new ConflictException(`Ya existe un vehículo con placa "${dto.plate}"`);
    }
    return this.vehicles.save({
      tenantId,
      plate: dto.plate,
      name: dto.name,
      capacity: dto.capacity ?? null,
      active: true,
    });
  }

  listVehicles(tenantId: string): Promise<Vehicle[]> {
    return this.vehicles.find({ where: { tenantId }, order: { plate: 'ASC' } });
  }

  async getVehicle(tenantId: string, id: string): Promise<Vehicle> {
    const vehicle = await this.vehicles.findOne({ where: { tenantId, id } });
    if (!vehicle) {
      throw new NotFoundException('Vehículo no encontrado');
    }
    return vehicle;
  }

  createCarrier(tenantId: string, dto: CreateCarrierDto): Promise<Carrier> {
    return this.carriers.save({
      tenantId,
      name: dto.name,
      contactEmail: dto.contactEmail ?? null,
      active: true,
    });
  }

  listCarriers(tenantId: string): Promise<Carrier[]> {
    return this.carriers.find({ where: { tenantId }, order: { name: 'ASC' } });
  }

  async getCarrier(tenantId: string, id: string): Promise<Carrier> {
    const carrier = await this.carriers.findOne({ where: { tenantId, id } });
    if (!carrier) {
      throw new NotFoundException('Carrier no encontrado');
    }
    return carrier;
  }
}
