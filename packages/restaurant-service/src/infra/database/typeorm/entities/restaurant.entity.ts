import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('restaurants')
export class RestaurantEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  ownerId!: string;

  @Column()
  name!: string;

  @Column('text')
  description!: string;

  @Column()
  street!: string;

  @Column()
  number!: string;

  @Column({ nullable: true })
  complement!: string | null;

  @Column()
  neighborhood!: string;

  @Column()
  city!: string;

  @Column({ length: 2 })
  state!: string;

  @Column({ length: 9 })
  zipCode!: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude!: number | null;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude!: number | null;

  @Column()
  phone!: string;

  @Column()
  email!: string;

  @Column()
  status!: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating!: number;

  @Column({ default: 0 })
  totalRatings!: number;

  @Column({ default: 0 })
  deliveryFeeCents!: number;

  @Column({ default: 0 })
  minOrderCents!: number;

  @Column({ default: 30 })
  estimatedPrepTimeMinutes!: number;

  @Column()
  version!: number;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
