import { MigrationInterface, QueryRunner } from "typeorm";

export class FieldOffline1788967031974 implements MigrationInterface {
    name = 'FieldOffline1788967031974'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "horaIniAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "horaLiqAt" TIMESTAMP WITH TIME ZONE`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "razonCierreSop" character varying`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "comentarioCierre" character varying`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "esOffline" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "alertaTiempo" boolean NOT NULL DEFAULT false`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "causaOffline" character varying`);
        await queryRunner.query(`ALTER TABLE "work_orders" ADD "causaOfflineEvidencia" character varying`);
        await queryRunner.query(`CREATE INDEX "IDX_6b3724ba9413637e4c2f1ea97b" ON "work_orders" ("esOffline") `);
        await queryRunner.query(`CREATE INDEX "IDX_2a6352cd6c2879366a4286add5" ON "work_orders" ("causaOffline") `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_2a6352cd6c2879366a4286add5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6b3724ba9413637e4c2f1ea97b"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "causaOfflineEvidencia"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "causaOffline"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "alertaTiempo"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "esOffline"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "comentarioCierre"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "razonCierreSop"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "horaLiqAt"`);
        await queryRunner.query(`ALTER TABLE "work_orders" DROP COLUMN "horaIniAt"`);
    }

}
