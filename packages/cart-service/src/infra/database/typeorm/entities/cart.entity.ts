import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { CartStatusEnum } from '../../../../domain/value-objects/cart-status.vo';

@Entity('carts')
@Index(['customerId', 'status'])
export class CartEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({ name: 'restaurant_id', nullable: true })
  restaurantId!: string | null;

  @Column({ type: 'jsonb', name: 'items' })
  items!: CartItemEntityProps[];

  @Column({ name: 'total_amount_cents', type: 'integer' })
  totalAmountCents!: number;

  @Column({
    type: 'enum',
    enum: CartStatusEnum,
    default: CartStatusEnum.ACTIVE,
  })
  status!: CartStatusEnum;

  @Column({ name: 'version', type: 'integer', default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

export interface CartItemEntityProps {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  restaurantId: string;
}
