import { NotFoundException } from '@nestjs/common';
import { PersonnelController } from './personnel.controller';
import { PersonnelDocsService } from './personnel-docs.service';

describe('PersonnelController.descargar', () => {
  function buildController(doc: Record<string, unknown> | null) {
    const service = {
      descargar: jest.fn().mockImplementation(() => {
        if (!doc) throw new NotFoundException('Documento no encontrado');
        return Promise.resolve(doc);
      }),
    };
    return { controller: new PersonnelController(service as unknown as PersonnelDocsService), service };
  }

  function fakeRes() {
    return { set: jest.fn(), send: jest.fn() };
  }

  it('manda los bytes crudos con res.send(), NO el Buffer serializado como JSON', async () => {
    const contenido = Buffer.from('hola mundo');
    const { controller } = buildController({
      contentType: 'text/plain',
      nombreArchivo: 'saludo.txt',
      contenido,
    });
    const res = fakeRes();

    await controller.descargar('t1', 'doc-1', res as never);

    expect(res.set).toHaveBeenCalledWith({
      'Content-Type': 'text/plain',
      'Content-Disposition': 'attachment; filename="saludo.txt"',
    });
    // Regresión: pasar el Buffer por `return` con @Res({passthrough:true})
    // hace que Nest lo serialice como {"type":"Buffer","data":[...]} en vez
    // de mandar los bytes — por eso se llama a res.send() directamente.
    expect(res.send).toHaveBeenCalledWith(contenido);
  });

  it('usa application/octet-stream si el documento no tiene contentType', async () => {
    const { controller } = buildController({ contentType: null, nombreArchivo: 'x.bin', contenido: Buffer.from('') });
    const res = fakeRes();
    await controller.descargar('t1', 'doc-1', res as never);
    expect(res.set).toHaveBeenCalledWith(expect.objectContaining({ 'Content-Type': 'application/octet-stream' }));
  });

  it('propaga NotFoundException si el documento no existe (antes de tocar la respuesta)', async () => {
    const { controller } = buildController(null);
    const res = fakeRes();
    await expect(controller.descargar('t1', 'doc-x', res as never)).rejects.toThrow(NotFoundException);
    expect(res.send).not.toHaveBeenCalled();
  });
});
