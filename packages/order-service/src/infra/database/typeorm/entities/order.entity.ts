import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { OrderItemEntity } from './order-item.entity';

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id' })
  customerId!: string;

  @Column({ name: 'restaurant_id' })
  restaurantId!: string;

  @Column({ type: 'enum', enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] })
  status!: string;

  @Column({ name: 'total_amount_cents', type: 'integer', default: 0 })
  totalAmountCents!: number;

  @Column({ name: 'payment_method_index', nullable: true })
  paymentMethodIndex?: number;

  @Column({
    name: 'payment_method_type',
    type: 'enum',
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'],
    nullable: true,
  })
  paymentMethodType?: string;

  @Column({ default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => OrderItemEntity, (item) => item.order, { cascade: true, eager: true })
  items!: OrderItemEntity[];
}
