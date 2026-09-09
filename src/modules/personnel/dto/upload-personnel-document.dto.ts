import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/** Campos de texto del formulario de subida (el archivo va aparte, multipart). */
export class UploadPersonnelDocumentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  colaborador!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;
}
