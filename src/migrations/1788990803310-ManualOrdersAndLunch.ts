import { MigrationInterface, QueryRunner } from "typeorm";

export class ManualOrdersAndLunch1788990803310 implements MigrationInterface {
    name = 'ManualOrdersAndLunch1788990803310'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "technician_lunches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "tecnico" character varying NOT NULL, "fecha" date NOT NULL, "horaInicioAt" TIMESTAMP WITH TIME ZONE NOT NULL, "horaFinAt" TIMESTAMP WITH TIME ZONE NOT NULL, "registradoPor" character varying, CONSTRAINT "UQ_6264ab293ee0b5179202d17fcc4" UNIQUE ("tenantId", "tecnico", "fecha"), CONSTRAINT "PK_524aea6749d75006e37abcc4aea" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_f16be4dd5a32345e93bd1fcfb4" ON "technician_lunches" ("tenantId") `);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "registradoPor" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "registradoPor"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_f16be4dd5a32345e93bd1fcfb4"`);
        await queryRunner.query(`DROP TABLE "technician_lunches"`);
    }

}
