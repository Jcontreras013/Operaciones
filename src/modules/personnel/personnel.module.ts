import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PersonnelDocument } from './entities/personnel-document.entity';
import { PersonnelDocsService } from './personnel-docs.service';
import { PersonnelController } from './personnel.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PersonnelDocument])],
  providers: [PersonnelDocsService],
  controllers: [PersonnelController],
})
export class PersonnelModule {}
