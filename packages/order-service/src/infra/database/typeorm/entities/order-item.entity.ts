import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('order_items')
export class OrderItemEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'product_name' })
  productName!: string;

  @Column()
  quantity!: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice!: number;

  @ManyToOne('OrderEntity', 'items')
  @JoinColumn({ name: 'order_id' })
  order!: import('./order.entity').OrderEntity;
}
