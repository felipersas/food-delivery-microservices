import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { KitchenTicketItemEntity } from './kitchen-ticket-item.entity';

@Entity('kitchen_tickets')
export class KitchenTicketEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'order_id' })
  orderId!: string;

  @Column({ type: 'enum', enum: ['WAITING', 'PREPARING', 'READY'] })
  status!: string;

  @Column({ default: 0 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;

  @OneToMany(() => KitchenTicketItemEntity, (item) => item.ticket, {
    cascade: true,
    eager: true,
  })
  items!: KitchenTicketItemEntity[];
}
