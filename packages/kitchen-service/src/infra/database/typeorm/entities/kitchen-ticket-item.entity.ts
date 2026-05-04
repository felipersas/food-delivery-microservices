import {
  Entity,
  PrimaryColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity('kitchen_ticket_items')
export class KitchenTicketItemEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'ticket_id' })
  ticketId!: string;

  @Column({ name: 'product_id' })
  productId!: string;

  @Column({ name: 'product_name' })
  productName!: string;

  @Column()
  quantity!: number;

  @ManyToOne('KitchenTicketEntity', 'items')
  @JoinColumn({ name: 'ticket_id' })
  ticket!: import('./kitchen-ticket.entity').KitchenTicketEntity;
}
