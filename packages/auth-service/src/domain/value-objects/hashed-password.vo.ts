import { ValueObject, InvalidStateException } from '@app/shared';

export interface HashedPasswordProps {
  value: string;
}

export class HashedPassword extends ValueObject<HashedPasswordProps> {
  private constructor(props: HashedPasswordProps) {
    super(props);
  }

  static create(hashedPassword: string): HashedPassword {
    HashedPassword.validate(hashedPassword);
    return new HashedPassword({ value: hashedPassword });
  }

  static async fromPlain(plainPassword: string): Promise<HashedPassword> {
    HashedPassword.validatePassword(plainPassword);
    const bcrypt = await import('bcrypt');
    const saltRounds = 10;
    const hashed = await bcrypt.hash(plainPassword, saltRounds);
    return new HashedPassword({ value: hashed });
  }

  async compare(plainPassword: string): Promise<boolean> {
    const bcrypt = await import('bcrypt');
    return bcrypt.compare(plainPassword, this.props.value);
  }

  private static validate(hashedPassword: string): void {
    if (!hashedPassword || hashedPassword.length < 60) {
      throw new InvalidStateException('Invalid hashed password');
    }
  }

  private static validatePassword(password: string): void {
    if (!password) {
      throw new InvalidStateException('Password is required');
    }
    if (password.length < 8) {
      throw new InvalidStateException('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      throw new InvalidStateException('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      throw new InvalidStateException('Password must contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
      throw new InvalidStateException('Password must contain at least one number');
    }
  }

  getHash(): string {
    return this.props.value;
  }
}
