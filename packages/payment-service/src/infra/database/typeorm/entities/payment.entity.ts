import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payments')
export class PaymentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ name: 'amount_cents', type: 'integer', default: 0 })
  amountCents!: number;

  @Column({ type: 'enum', enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'] })
  method!: string;

  @Column({
    type: 'enum',
    enum: ['PENDING', 'CONFIRMED', 'REJECTED', 'PARTIALLY_REFUNDED', 'FULLY_REFUNDED'],
  })
  status!: string;

  @Column({ name: 'customer_id', nullable: true })
  customerId?: string;

  @Column({ name: 'payment_method_token', nullable: true })
  paymentMethodToken?: string;

  @Column({ name: 'payment_method_brand', nullable: true })
  paymentMethodBrand?: string;

  @Column({ name: 'refunded_amount_cents', type: 'integer', default: 0 })
  refundedAmountCents!: number;

  @Column({ default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
