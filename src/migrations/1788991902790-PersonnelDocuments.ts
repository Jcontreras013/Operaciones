import { MigrationInterface, QueryRunner } from "typeorm";

export class PersonnelDocuments1788991902790 implements MigrationInterface {
    name = 'PersonnelDocuments1788991902790'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "personnel_documents" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "colaborador" character varying NOT NULL, "nombreArchivo" character varying NOT NULL, "contentType" character varying, "tamanoBytes" integer NOT NULL, "descripcion" character varying, "contenido" bytea NOT NULL, "subidoPor" character varying NOT NULL, CONSTRAINT "PK_20971da0b7061eda24f040b24a4" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_6056f5e5b36b8cd30e103e75b6" ON "personnel_documents" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6d38ffc1e0e27f34390f7b7d2f" ON "personnel_documents" ("colaborador") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_6d38ffc1e0e27f34390f7b7d2f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6056f5e5b36b8cd30e103e75b6"`);
        await queryRunner.query(`DROP TABLE "personnel_documents"`);
    }

}
