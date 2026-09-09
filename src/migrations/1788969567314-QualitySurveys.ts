import { MigrationInterface, QueryRunner } from "typeorm";

export class QualitySurveys1788969567314 implements MigrationInterface {
    name = 'QualitySurveys1788969567314'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."quality_surveys_contactresult_enum" AS ENUM('contestada', 'cliente_no_desea_participar', 'responsable_no_disponible', 'llamada_reprogramada', 'numero_equivocado', 'sin_respuesta_dos_intentos')`);
        await queryRunner.query(`CREATE TYPE "public"."quality_surveys_aprobacioninterna_enum" AS ENUM('aprobado', 'con_observaciones', 'no_aprobado')`);
        await queryRunner.query(`CREATE TABLE "quality_surveys" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "tenantId" uuid NOT NULL, "workOrderId" uuid NOT NULL, "externalNum" character varying NOT NULL, "cliente" character varying, "tecnico" character varying, "actividad" character varying, "contactResult" "public"."quality_surveys_contactresult_enum" NOT NULL, "p1Puntualidad" smallint, "p2PresentacionTrato" smallint, "p3ClaridadExplicacion" smallint, "p4NoAplica" boolean NOT NULL DEFAULT false, "p4TvCcveo" smallint, "p5CalidadServicio" smallint, "p6Limpieza" smallint, "p7Satisfaccion" smallint, "comentarioMejora" character varying, "aprobacionInterna" "public"."quality_surveys_aprobacioninterna_enum", "firmante" character varying, "horaCierre" character varying, "fechaVisita" character varying, "requiereSeguimiento" boolean NOT NULL DEFAULT false, "seguimientoTicket" character varying, "seguimientoResponsable" character varying, "seguimientoFechaLimite" date, "seguimientoResuelto" boolean NOT NULL DEFAULT false, "gestionadoPor" uuid, CONSTRAINT "PK_1257627c40aef591773790597dd" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_cd253a175b5c086a6291059704" ON "quality_surveys" ("tenantId") `);
        await queryRunner.query(`CREATE INDEX "IDX_e5d53be77b8f601df81af0975f" ON "quality_surveys" ("workOrderId") `);
        await queryRunner.query(`CREATE INDEX "IDX_48969d8944fb83e2d2dbec501e" ON "quality_surveys" ("contactResult") `);
        await queryRunner.query(`CREATE INDEX "IDX_2cc14a53e523ec0ee1c7b4dbad" ON "quality_surveys" ("requiereSeguimiento") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2cc14a53e523ec0ee1c7b4dbad"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_48969d8944fb83e2d2dbec501e"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e5d53be77b8f601df81af0975f"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_cd253a175b5c086a6291059704"`);
        await queryRunner.query(`DROP TABLE "quality_surveys"`);
        await queryRunner.query(`DROP TYPE "public"."quality_surveys_aprobacioninterna_enum"`);
        await queryRunner.query(`DROP TYPE "public"."quality_surveys_contactresult_enum"`);
    }

}
