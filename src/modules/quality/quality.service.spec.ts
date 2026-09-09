import { NotFoundException } from '@nestjs/common';
import { QualityService } from './quality.service';
import { ContactResult, AprobacionInterna } from './entities/quality-survey.entity';
import { CreateQualitySurveyDto } from './dto/create-quality-survey.dto';

const tenantId = 't1';
const workOrderId = 'wo-1';

function build() {
  const order = {
    id: workOrderId,
    externalNum: 'ORD-1001',
    cliente: 'Juan Pérez',
    tecnico: 'Norman Guardado',
    actividad: 'SOPFIBRA',
  };
  const orders = { findOne: jest.fn().mockResolvedValue(order) };
  const surveys = {
    create: jest.fn((o: Record<string, unknown>) => o),
    save: jest.fn((o: Record<string, unknown>) => Promise.resolve({ id: 'q1', ...o })),
    findOne: jest.fn(),
  };
  const service = new QualityService(surveys as never, orders as never);
  return { service, surveys, orders };
}

function baseDto(overrides: Partial<CreateQualitySurveyDto> = {}): CreateQualitySurveyDto {
  return Object.assign(new CreateQualitySurveyDto(), { workOrderId, contactResult: ContactResult.CONTESTADA }, overrides);
}

describe('QualityService.create', () => {
  it('lanza NotFoundException si la orden no existe', async () => {
    const { service, orders } = build();
    orders.findOne.mockResolvedValue(null);
    await expect(service.create(tenantId, baseDto())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('copia cliente/técnico/actividad/externalNum de la orden', async () => {
    const { service } = build();
    const saved = await service.create(tenantId, baseDto());
    expect(saved).toMatchObject({
      externalNum: 'ORD-1001',
      cliente: 'Juan Pérez',
      tecnico: 'Norman Guardado',
      actividad: 'SOPFIBRA',
    });
  });

  it('guarda las 7 calificaciones cuando contactResult=CONTESTADA', async () => {
    const { service } = build();
    const dto = baseDto({
      p1Puntualidad: 5,
      p2PresentacionTrato: 5,
      p3ClaridadExplicacion: 4,
      p4TvCcveo: 3,
      p5CalidadServicio: 5,
      p6Limpieza: 4,
      p7Satisfaccion: 5,
      aprobacionInterna: AprobacionInterna.APROBADO,
    });
    const saved = await service.create(tenantId, dto);
    expect(saved).toMatchObject({
      p1Puntualidad: 5,
      p2PresentacionTrato: 5,
      p3ClaridadExplicacion: 4,
      p4TvCcveo: 3,
      p5CalidadServicio: 5,
      p6Limpieza: 4,
      p7Satisfaccion: 5,
      aprobacionInterna: AprobacionInterna.APROBADO,
    });
  });

  it('deja "No aplica" en P4: guarda la bandera y p4TvCcveo queda null', async () => {
    const { service } = build();
    const dto = baseDto({
      p1Puntualidad: 5,
      p2PresentacionTrato: 5,
      p3ClaridadExplicacion: 5,
      p4NoAplica: true,
      p5CalidadServicio: 5,
      p6Limpieza: 5,
      p7Satisfaccion: 5,
    });
    const saved = await service.create(tenantId, dto);
    expect(saved.p4NoAplica).toBe(true);
    expect(saved.p4TvCcveo).toBeNull();
  });

  it('anula todas las calificaciones si la llamada no fue contestada, aunque vengan en el DTO', async () => {
    const { service } = build();
    const dto = baseDto({
      contactResult: ContactResult.NUMERO_EQUIVOCADO,
      p1Puntualidad: 5, // no debería guardarse: el DTO real no las mandaría, pero el service igual las ignora
      p7Satisfaccion: 5,
    });
    const saved = await service.create(tenantId, dto);
    expect(saved.p1Puntualidad).toBeNull();
    expect(saved.p7Satisfaccion).toBeNull();
    expect(saved.aprobacionInterna).toBeNull();
  });

  it('guarda los datos de seguimiento solo si requiereSeguimiento=true', async () => {
    const { service } = build();
    const dto = baseDto({
      contactResult: ContactResult.RESPONSABLE_NO_DISPONIBLE,
      requiereSeguimiento: true,
      seguimientoTicket: 'TCK-9',
      seguimientoResponsable: 'Miguel',
      seguimientoFechaLimite: '2026-09-20',
    });
    const saved = await service.create(tenantId, dto);
    expect(saved).toMatchObject({
      requiereSeguimiento: true,
      seguimientoTicket: 'TCK-9',
      seguimientoResponsable: 'Miguel',
      seguimientoFechaLimite: '2026-09-20',
      seguimientoResuelto: false,
    });
  });

  it('no guarda datos de seguimiento si requiereSeguimiento no viene o es false', async () => {
    const { service } = build();
    const saved = await service.create(tenantId, baseDto({ seguimientoTicket: 'TCK-9' }));
    expect(saved.requiereSeguimiento).toBe(false);
    expect(saved.seguimientoTicket).toBeNull();
  });
});

describe('QualityService.resolverSeguimiento', () => {
  it('lanza NotFoundException si el registro no existe', async () => {
    const { service, surveys } = build();
    surveys.findOne.mockResolvedValue(null);
    await expect(service.resolverSeguimiento(tenantId, 'q1', true)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('marca seguimientoResuelto', async () => {
    const { service, surveys } = build();
    surveys.findOne.mockResolvedValue({ id: 'q1', seguimientoResuelto: false });
    const saved = await service.resolverSeguimiento(tenantId, 'q1', true);
    expect(saved.seguimientoResuelto).toBe(true);
  });

  it('con soloPropio, busca también por gestionadoPor (Monitoreo/Llamados solo ven lo suyo)', async () => {
    const { service, surveys } = build();
    surveys.findOne.mockResolvedValue({ id: 'q1', seguimientoResuelto: false });
    await service.resolverSeguimiento(tenantId, 'q1', true, 'user-miguel');
    expect(surveys.findOne).toHaveBeenCalledWith({
      where: { tenantId, id: 'q1', gestionadoPor: 'user-miguel' },
    });
  });
});
