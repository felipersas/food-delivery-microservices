import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('menu_items')
export class MenuItemEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  restaurantId!: string;

  @Column()
  name!: string;

  @Column('text')
  description!: string;

  @Column()
  priceCents!: number;

  @Column()
  category!: string;

  @Column({ nullable: true })
  imageUrl!: string | null;

  @Column({ default: true })
  available!: boolean;

  @Column({ default: 15 })
  preparationTimeMinutes!: number;

  @Column()
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
