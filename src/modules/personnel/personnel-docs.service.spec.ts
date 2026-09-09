import { NotFoundException } from '@nestjs/common';
import { PersonnelDocsService } from './personnel-docs.service';
import { PERSONAL_CONOCIDO } from './personal-conocido';

describe('PersonnelDocsService', () => {
  function buildRepo(existing: Partial<Record<string, unknown>> | null = null) {
    const qb = {
      select: jest.fn().mockReturnThis(),
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      getRawMany: jest.fn().mockResolvedValue([]),
      getOne: jest.fn().mockResolvedValue(existing),
    };
    return {
      create: jest.fn((o: Record<string, unknown>) => o),
      save: jest.fn((o: Record<string, unknown>) => Promise.resolve({ ...o, id: 'doc-1' })),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue(existing),
      delete: jest.fn().mockResolvedValue({ affected: 1 }),
      createQueryBuilder: jest.fn(() => qb),
      __qb: qb,
    };
  }

  it('sube un documento con el colaborador normalizado en mayúsculas', async () => {
    const repo = buildRepo();
    const service = new PersonnelDocsService(repo as never);
    const file = { originalname: 'contrato.pdf', mimetype: 'application/pdf', size: 1234, buffer: Buffer.from('x') };
    const doc = await service.subir('t1', '  norman guardado  ', '  Contrato firmado  ', file, 'user-1');
    expect(doc).toMatchObject({
      tenantId: 't1',
      colaborador: 'NORMAN GUARDADO',
      nombreArchivo: 'contrato.pdf',
      contentType: 'application/pdf',
      tamanoBytes: 1234,
      descripcion: 'Contrato firmado',
      subidoPor: 'user-1',
    });
  });

  it('la respuesta de subir NO incluye el contenido del archivo (save() lo devuelve tal cual se guardó)', async () => {
    const repo = buildRepo();
    const service = new PersonnelDocsService(repo as never);
    const file = { originalname: 'contrato.pdf', mimetype: 'application/pdf', size: 1234, buffer: Buffer.from('x') };
    const doc = await service.subir('t1', 'Norman', null, file, 'user-1');
    expect(doc).not.toHaveProperty('contenido');
  });

  it('descripcion vacía o ausente se guarda como null', async () => {
    const repo = buildRepo();
    const service = new PersonnelDocsService(repo as never);
    const file = { originalname: 'id.jpg', mimetype: 'image/jpeg', size: 10, buffer: Buffer.from('x') };
    const doc = await service.subir('t1', 'Norman', '   ', file, 'user-1');
    expect(doc.descripcion).toBeNull();
  });

  it('listarColaboradores combina el catálogo conocido con los que ya tienen documentos', async () => {
    const repo = buildRepo();
    repo.__qb.getRawMany.mockResolvedValue([{ colaborador: 'UN COLABORADOR NUEVO' }]);
    const service = new PersonnelDocsService(repo as never);
    const lista = await service.listarColaboradores('t1');
    expect(lista).toContain('UN COLABORADOR NUEVO');
    expect(lista).toContain(PERSONAL_CONOCIDO[0]);
    // Sin duplicados y ordenada.
    expect(lista).toEqual([...new Set(lista)].sort());
  });

  it('listarPorColaborador normaliza el nombre antes de buscar', async () => {
    const repo = buildRepo();
    const service = new PersonnelDocsService(repo as never);
    await service.listarPorColaborador('t1', '  norman guardado  ');
    expect(repo.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { tenantId: 't1', colaborador: 'NORMAN GUARDADO' } }),
    );
  });

  it('descargar rechaza si el documento no existe', async () => {
    const repo = buildRepo(null);
    const service = new PersonnelDocsService(repo as never);
    await expect(service.descargar('t1', 'doc-x')).rejects.toThrow(NotFoundException);
  });

  it('descargar trae el contenido explícitamente (select: false por defecto)', async () => {
    const repo = buildRepo({ id: 'doc-1', contenido: Buffer.from('hola') });
    const service = new PersonnelDocsService(repo as never);
    const doc = await service.descargar('t1', 'doc-1');
    expect(repo.__qb.addSelect).toHaveBeenCalledWith('d.contenido');
    expect(doc.contenido.toString()).toBe('hola');
  });

  it('borrar rechaza si el documento no existe o es de otro tenant', async () => {
    const repo = buildRepo(null);
    const service = new PersonnelDocsService(repo as never);
    await expect(service.borrar('t1', 'doc-x')).rejects.toThrow(NotFoundException);
  });

  it('borrar elimina un documento existente', async () => {
    const repo = buildRepo({ id: 'doc-1' });
    const service = new PersonnelDocsService(repo as never);
    await service.borrar('t1', 'doc-1');
    expect(repo.delete).toHaveBeenCalledWith({ id: 'doc-1' });
  });
});
