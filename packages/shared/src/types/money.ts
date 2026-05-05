import { ValueObject } from '../domain/value-object';
import { ValidationException } from '../exceptions/domain.exception';

export interface MoneyProps {
  amount: number;
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  get amount(): number {
    return this.props.amount;
  }

  get currency(): string {
    return this.props.currency;
  }

  static BRL(amount: number): Money {
    return new Money({ amount, currency: 'BRL' });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ amount: this.props.amount + other.amount, currency: this.props.currency });
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ amount: this.props.amount - other.amount, currency: this.props.currency });
  }

  isNegative(): boolean {
    return this.props.amount < 0;
  }

  isZero(): boolean {
    return this.props.amount === 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.amount > other.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.currency) {
      throw new ValidationException(`Currency mismatch: ${this.props.currency} vs ${other.currency}`);
    }
  }
}
