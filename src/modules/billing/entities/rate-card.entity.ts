import { Column, Entity, Index } from 'typeorm';
import { TenantOwnedEntity } from '@common/database/base.entity';

/**
 * Rate card de un cliente (US3.1): el conjunto de reglas de tarifa que el
 * operador aplica a ese cliente. Un cliente puede tener varias en el tiempo;
 * solo una activa a la vez en la Fase 0.
 */
@Entity('rate_cards')
export class RateCard extends TenantOwnedEntity {
  @Index()
  @Column('uuid')
  clientId!: string;

  @Column()
  name!: string;

  @Column({ length: 3, default: 'USD' })
  currency!: string;

  @Column({ default: true })
  active!: boolean;
}
