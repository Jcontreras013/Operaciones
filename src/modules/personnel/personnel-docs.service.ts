import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonnelDocument } from './entities/personnel-document.entity';
import { PERSONAL_CONOCIDO } from './personal-conocido';

/** Forma mínima de un archivo de multer que necesitamos (evita depender de @types/multer). */
export interface UploadedFileLike {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@Injectable()
export class PersonnelDocsService {
  constructor(@InjectRepository(PersonnelDocument) private readonly docs: Repository<PersonnelDocument>) {}

  async subir(
    tenantId: string,
    colaborador: string,
    descripcion: string | null | undefined,
    file: UploadedFileLike,
    subidoPor: string,
  ): Promise<Omit<PersonnelDocument, 'contenido'>> {
    const doc = this.docs.create({
      tenantId,
      colaborador: colaborador.trim().toUpperCase(),
      nombreArchivo: file.originalname,
      contentType: file.mimetype || null,
      tamanoBytes: file.size,
      descripcion: descripcion?.trim() || null,
      contenido: file.buffer,
      subidoPor,
    });
    const guardado = await this.docs.save(doc);
    // .save() devuelve el objeto tal cual se le pasó (con el contenido
    // incluido) — `select: false` en la entidad solo aplica a find/findOne,
    // así que hay que quitarlo a mano para no reenviar el archivo entero
    // como respuesta de la subida.
    const { contenido: _contenido, ...sinContenido } = guardado;
    return sinContenido;
  }

  /**
   * Colaboradores para el selector: el catálogo conocido (personal técnico +
   * SAC/administrativo) más cualquier nombre que ya tenga documentos (por si
   * se subió "escribiendo uno nuevo", como en el original).
   */
  async listarColaboradores(tenantId: string): Promise<string[]> {
    const rows = await this.docs
      .createQueryBuilder('d')
      .select('DISTINCT d.colaborador', 'colaborador')
      .where('d."tenantId" = :tenantId', { tenantId })
      .getRawMany<{ colaborador: string }>();
    const conDocumentos = rows.map((r) => r.colaborador);
    return [...new Set([...PERSONAL_CONOCIDO, ...conDocumentos])].sort();
  }

  /** Documentos de un colaborador (sin el contenido — para listar/explorar). */
  listarPorColaborador(tenantId: string, colaborador: string): Promise<PersonnelDocument[]> {
    return this.docs.find({
      where: { tenantId, colaborador: colaborador.trim().toUpperCase() },
      order: { createdAt: 'DESC' },
    });
  }

  async descargar(tenantId: string, id: string): Promise<PersonnelDocument> {
    const doc = await this.docs
      .createQueryBuilder('d')
      .addSelect('d.contenido')
      .where('d."tenantId" = :tenantId AND d.id = :id', { tenantId, id })
      .getOne();
    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  async borrar(tenantId: string, id: string): Promise<void> {
    const doc = await this.docs.findOne({ where: { tenantId, id } });
    if (!doc) throw new NotFoundException('Documento no encontrado');
    await this.docs.delete({ id: doc.id });
  }
}
