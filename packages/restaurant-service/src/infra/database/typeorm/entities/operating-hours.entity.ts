import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('operating_hours')
export class OperatingHoursEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column('uuid')
  restaurantId!: string;

  @Column({ type: 'smallint' })
  dayOfWeek!: number;

  @Column({ length: 5 })
  openTime!: string;

  @Column({ length: 5 })
  closeTime!: string;
}
