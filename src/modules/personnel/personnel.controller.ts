import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { CurrentTenant, CurrentUserId } from '@common/tenant/current-tenant.decorator';
import { TENANT_AUTH } from '@common/swagger.constants';
import { RolesGuard } from '@common/auth/roles.guard';
import { PersonnelRepoGuard } from './personnel-repo.guard';
import { PersonnelDocsService, UploadedFileLike } from './personnel-docs.service';
import { UploadPersonnelDocumentDto } from './dto/upload-personnel-document.dto';

const MAX_TAMANO_BYTES = 20 * 1024 * 1024; // 20 MB — documentos laborales, no debería hacer falta más.

/**
 * Repositorio de Documentos ("Expedientes" del monitor original), sin la
 * clasificación disciplinaria automática ni la generación de PDF/DOCX de
 * incidencias (eso queda para más adelante). El acceso es por PERSONA
 * (PersonnelRepoGuard), no por rol — ver el comentario ahí.
 */
@ApiTags('Personal (repositorio de documentos)')
@ApiSecurity(TENANT_AUTH)
@Controller('v1/personnel')
@UseGuards(RolesGuard, PersonnelRepoGuard)
export class PersonnelController {
  constructor(private readonly docs: PersonnelDocsService) {}

  @Get('colaboradores')
  listarColaboradores(@CurrentTenant() tenantId: string) {
    return this.docs.listarColaboradores(tenantId);
  }

  @Get('documentos')
  listarPorColaborador(@CurrentTenant() tenantId: string, @Query('colaborador') colaborador: string) {
    return this.docs.listarPorColaborador(tenantId, colaborador ?? '');
  }

  @Post('documentos')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_TAMANO_BYTES } }))
  subir(
    @CurrentTenant() tenantId: string,
    @Body() dto: UploadPersonnelDocumentDto,
    @UploadedFile() file: UploadedFileLike | undefined,
    @CurrentUserId() userId: string | undefined,
  ) {
    if (!file) {
      throw new NotFoundException('Selecciona al menos un archivo');
    }
    return this.docs.subir(tenantId, dto.colaborador, dto.descripcion, file, userId ?? 'desconocido');
  }

  /**
   * Sin `passthrough`: Nest no debe tocar la respuesta. Con passthrough (o
   * devolviendo el valor), trata el Buffer como un objeto cualquiera y lo
   * serializa como `{"type":"Buffer","data":[...]}` en vez de mandar los
   * bytes — hay que llamar a `res.send()` a mano.
   */
  @Get('documentos/:id/descargar')
  async descargar(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string, @Res() res: Response) {
    const doc = await this.docs.descargar(tenantId, id);
    res.set({
      'Content-Type': doc.contentType ?? 'application/octet-stream',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(doc.nombreArchivo)}"`,
    });
    res.send(doc.contenido);
  }

  @Delete('documentos/:id')
  borrar(@CurrentTenant() tenantId: string, @Param('id', ParseUUIDPipe) id: string) {
    return this.docs.borrar(tenantId, id);
  }
}
