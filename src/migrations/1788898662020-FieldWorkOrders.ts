import { MigrationInterface, QueryRunner } from "typeorm";

export class FieldWorkOrders1788898662020 implements MigrationInterface {
    name = 'FieldWorkOrders1788898662020'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "work_orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "externalNum" character varying NOT NULL, "cliente" character varying, "tecnico" character varying, "actividad" character varying, "estado" character varying, "tipoOrden" character varying, "subtipo" character varying, "segmento" character varying, "grupo" character varying, "colonia" character varying, "olt" character varying, "pon" character varying, "causa" character varying, "motivo" character varying, "comentario" character varying, "atribucion" character varying, "gps" character varying, "mxref" character varying, "fechaApe" TIMESTAMP WITH TIME ZONE, "fechaApeRaw" character varying, "horaIni" character varying, "horaLiq" character varying, "raw" jsonb NOT NULL, "source" character varying NOT NULL DEFAULT 'cepheus', "ingestedAt" TIMESTAMP WITH TIME ZONE NOT NULL, CONSTRAINT "UQ_7eff1db5d2305aaf9252aec8cdb" UNIQUE ("tenantId", "externalNum"), CONSTRAINT "PK_29f6c1884082ee6f535aed93660" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5a85350ec657a0822a9c2f3196" ON "work_orders" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_836d78eabce758c93016e80e43" ON "work_orders" ("externalNum") `);
        await queryRunner.query(`CREATE INDEX "IDX_79dabc2e9ec03d783297aeca6d" ON "work_orders" ("tecnico") `);
        await queryRunner.query(`CREATE INDEX "IDX_0aa296983263cd7e851601cf74" ON "work_orders" ("actividad") `);
        await queryRunner.query(`CREATE INDEX "IDX_235ed10b95a03f8375662c316f" ON "work_orders" ("estado") `);
        await queryRunner.query(`CREATE INDEX "IDX_a6fb886e73178e6b85c69c6da9" ON "work_orders" ("olt") `);
        await queryRunner.query(`CREATE INDEX "IDX_683adbe68ef2f235cd5792fe2a" ON "work_orders" ("fechaApe") `);
        await queryRunner.query(`CREATE TABLE "ingest_runs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "source" character varying NOT NULL DEFAULT 'cepheus', "requestedFrom" TIMESTAMP WITH TIME ZONE NOT NULL, "status" character varying NOT NULL DEFAULT 'ok', "fetched" integer NOT NULL DEFAULT '0', "created" integer NOT NULL DEFAULT '0', "updated" integer NOT NULL DEFAULT '0', "error" character varying, CONSTRAINT "PK_182d40b3089f639e72d9d70b59e" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_85843ff366e0e2e8389cc2c888" ON "ingest_runs" ("tenantId") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_85843ff366e0e2e8389cc2c888"`);
        await queryRunner.query(`DROP TABLE "ingest_runs"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_683adbe68ef2f235cd5792fe2a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a6fb886e73178e6b85c69c6da9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_235ed10b95a03f8375662c316f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_0aa296983263cd7e851601cf74"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_79dabc2e9ec03d783297aeca6d"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_836d78eabce758c93016e80e43"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5a85350ec657a0822a9c2f3196"`);
        await queryRunner.query(`DROP TABLE "work_orders"`);
    }

}
