import { ValueObject, InvalidStateException } from '@app/shared';

export interface EmailProps {
  value: string;
}

export class Email extends ValueObject<EmailProps> {
  private constructor(props: EmailProps) {
    super(props);
  }

  static create(email: string): Email {
    const normalized = email.toLowerCase().trim();
    Email.validate(normalized);
    return new Email({ value: normalized });
  }

  private static validate(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      throw new InvalidStateException('Invalid email format');
    }
  }

  getEmail(): string {
    return this.props.value;
  }
}
