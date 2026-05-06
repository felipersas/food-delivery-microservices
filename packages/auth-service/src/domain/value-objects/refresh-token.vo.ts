import { ValueObject, InvalidStateException } from '@app/shared';
import { v4 as uuidv4 } from 'uuid';

export interface RefreshTokenProps {
  token: string;
  deviceId: string;
  expiresAt: Date;
  createdAt: Date;
}

export class RefreshToken extends ValueObject<RefreshTokenProps> {
  private constructor(props: RefreshTokenProps) {
    super(props);
  }

  static create(deviceId: string, expiresInDays: number = 7): RefreshToken {
    if (!deviceId || deviceId.trim().length === 0) {
      throw new InvalidStateException('Device ID is required');
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + expiresInDays * 24 * 60 * 60 * 1000);

    return new RefreshToken({
      token: uuidv4(),
      deviceId: deviceId.trim(),
      expiresAt,
      createdAt: now,
    });
  }

  static reconstitute(props: {
    token: string;
    deviceId: string;
    expiresAt: Date;
    createdAt: Date;
  }): RefreshToken {
    return new RefreshToken(props);
  }

  isValid(): boolean {
    return this.props.expiresAt > new Date();
  }

  isExpired(): boolean {
    return this.props.expiresAt <= new Date();
  }

  matchesDeviceId(deviceId: string): boolean {
    return this.props.deviceId === deviceId;
  }

  get token(): string {
    return this.props.token;
  }

  get deviceId(): string {
    return this.props.deviceId;
  }

  get expiresAt(): Date {
    return this.props.expiresAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}
