import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('refresh_tokens')
export class RefreshTokenEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column()
  @Index()
  userId!: string;

  @Column({ unique: true })
  @Index()
  token!: string;

  @Column()
  deviceId!: string;

  @Column({ type: 'timestamp' })
  @Index()
  expiresAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;

  static create(props: {
    userId: string;
    token: string;
    deviceId: string;
    expiresAt: Date;
  }): RefreshTokenEntity {
    const entity = new RefreshTokenEntity();
    entity.id = uuidv4();
    entity.userId = props.userId;
    entity.token = props.token;
    entity.deviceId = props.deviceId;
    entity.expiresAt = props.expiresAt;
    return entity;
  }
}
