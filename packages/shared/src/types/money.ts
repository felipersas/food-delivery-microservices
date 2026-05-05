import { ValueObject } from '../domain/value-object';
import { ValidationException } from '../exceptions/domain.exception';

export interface MoneyProps {
  cents: number; // Store as integer cents to avoid floating-point precision issues
  currency: string;
}

export class Money extends ValueObject<MoneyProps> {
  get cents(): number {
    return this.props.cents;
  }

  // Convenience getter for amount in BRL (divided by 100)
  get amount(): number {
    return this.props.cents / 100;
  }

  get currency(): string {
    return this.props.currency;
  }

  /**
   * Create a Money value in BRL from decimal amount (e.g., 10.50 becomes 1050 cents)
   * @param decimalAmount - Amount in BRL as decimal (e.g., 10.50)
   */
  static BRL(decimalAmount: number): Money {
    const cents = Math.round(decimalAmount * 100);
    return new Money({ cents, currency: 'BRL' });
  }

  /**
   * Create a Money value directly from cents (e.g., 1050 cents = R$ 10.50)
   * @param cents - Amount in cents as integer
   */
  static BRLFromCents(cents: number): Money {
    return new Money({ cents, currency: 'BRL' });
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ cents: this.props.cents + other.cents, currency: this.props.currency });
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ cents: this.props.cents - other.cents, currency: this.props.currency });
  }

  isNegative(): boolean {
    return this.props.cents < 0;
  }

  isZero(): boolean {
    return this.props.cents === 0;
  }

  isGreaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.props.cents > other.cents;
  }

  private assertSameCurrency(other: Money): void {
    if (this.props.currency !== other.currency) {
      throw new ValidationException(`Currency mismatch: ${this.props.currency} vs ${other.currency}`);
    }
  }
}
