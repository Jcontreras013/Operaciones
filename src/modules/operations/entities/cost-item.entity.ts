import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Costo real incurrido en una operación (US2.5): flete, handling, almacenaje…
 * Sirve para calcular margen y, en Fase 0/1, para conciliar contra las
 * facturas de carrier antes de facturar al cliente.
 */
@Entity('cost_items')
export class CostItem extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  operationId!: string;

  @Column()
  concept!: string;

  /** Monto en la menor unidad de la moneda (ej. centavos) para evitar flotantes. */
  @Column('bigint')
  amountMinor!: string;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  /** Proveedor/carrier al que corresponde el costo. */
  @Column({ nullable: true })
  supplier!: string | null;
}
