import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { DocumentType } from '../entities/document.entity';

export class AddDocumentDto {
  @IsEnum(DocumentType)
  @IsOptional()
  type?: DocumentType;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  fileName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1024)
  storageKey!: string;

  @IsString()
  @IsOptional()
  @MaxLength(120)
  contentType?: string;
}
