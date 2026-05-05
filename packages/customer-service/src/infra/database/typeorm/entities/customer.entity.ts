import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('customers')
@Index(['email'], { unique: true })
@Index(['status'])
export class CustomerEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  name!: string;

  @Column()
  email!: string;

  @Column()
  phone!: string;

  @Column({ type: 'enum', enum: ['ACTIVE', 'INACTIVE', 'SUSPENDED'], default: 'ACTIVE' })
  status!: string;

  @Column({ type: 'jsonb', default: [] })
  addresses!: Array<{
    street: string;
    number: string;
    complement?: string;
    city: string;
    state: string;
    zipCode: string;
    isDefault: boolean;
  }>;

  @Column({ name: 'payment_methods', type: 'jsonb', default: [] })
  paymentMethods!: Array<{
    token: string;
    brand: string;
    expiryMonth: number;
    expiryYear: number;
    isDefault: boolean;
  }>;

  @Column({ name: 'total_orders', default: 0 })
  totalOrders!: number;

  @Column({ name: 'total_spent', type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalSpent!: number;

  @Column({ default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
