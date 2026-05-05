import { ValueObject } from '../domain/value-object';
import { ValidationException } from '../exceptions/domain.exception';

/**
 * Properties for Money value object.
 * Money is stored as integer cents to avoid floating-point precision issues.
 *
 * @example
 * // R$ 10.50 is stored as { cents: 1050, currency: 'BRL' }
 * // R$ 0.99 is stored as { cents: 99, currency: 'BRL' }
 */
export interface MoneyProps {
  /** Amount in cents (integer) - e.g., 1050 cents = R$ 10.50 */
  cents: number;
  /** Currency code (e.g., 'BRL', 'USD') */
  currency: string;
}

/**
 * Money value object using integer cents for precise monetary calculations.
 *
 * **Why cents instead of decimals?**
 * Floating-point arithmetic can introduce precision errors:
 * - 0.1 + 0.2 !== 0.3 in JavaScript (returns 0.30000000000000004)
 * - 0.29 * 100 === 28.999999999999996 (not 29!)
 *
 * By storing amounts as integer cents, we avoid all floating-point issues:
 * - 1050 cents is exactly R$ 10.50
 * - 99 cents is exactly R$ 0.99
 * - All arithmetic operations are exact
 *
 * @example
 * ```typescript
 * // Create from decimal (common for user input)
 * const price = Money.BRL(10.50); // 1050 cents internally
 * console.log(price.amount); // 10.5
 * console.log(price.cents); // 1050
 *
 * // Create from cents (common for database storage)
 * const stored = Money.BRLFromCents(1050); // R$ 10.50
 *
 * // Arithmetic is exact
 * const total = price.add(Money.BRL(5.50)); // Exactly R$ 16.00
 * const discount = total.subtract(Money.BRL(1)); // Exactly R$ 15.00
 * ```
 */
export class Money extends ValueObject<MoneyProps> {
  /**
   * Get the amount in cents (integer).
   * Use this for database persistence and API contracts.
   *
   * @example
   * payment.amountCents = money.cents;
   */
  get cents(): number {
    return this.props.cents;
  }

  /**
   * Get the amount in decimal BRL (cents / 100).
   * Use this for display purposes and calculations with external systems.
   *
   * ⚠️ WARNING: Due to JavaScript floating-point precision,
   * use `.cents` for any persistence or comparison operations.
   *
   * @example
   * console.log(`Total: R$ ${money.amount.toFixed(2)}`);
   */
  get amount(): number {
    return this.props.cents / 100;
  }

  /** Get the currency code (e.g., 'BRL', 'USD') */
  get currency(): string {
    return this.props.currency;
  }

  /**
   * Create a Money value in BRL from decimal amount.
   * The decimal is converted to cents using Math.round() to handle edge cases.
   *
   * @param decimalAmount - Amount in BRL as decimal (e.g., 10.50)
   * @returns Money object with amount stored as cents
   *
   * @example
   * Money.BRL(10.50); // 1050 cents
   * Money.BRL(0.99);  // 99 cents
   * Money.BRL(10.555); // 1056 cents (rounded)
   */
  static BRL(decimalAmount: number): Money {
    const cents = Math.round(decimalAmount * 100);
    return new Money({ cents, currency: 'BRL' });
  }

  /**
   * Create a Money value directly from cents.
   * Use this when loading from database or receiving cents from external systems.
   *
   * @param cents - Amount in cents as integer
   * @returns Money object
   *
   * @example
   * Money.BRLFromCents(1050); // R$ 10.50
   * Money.BRLFromCents(99);   // R$ 0.99
   */
  static BRLFromCents(cents: number): Money {
    return new Money({ cents, currency: 'BRL' });
  }

  /**
   * Add two Money values of the same currency.
   * @param other - Money value to add
   * @returns New Money object with summed amounts
   */
  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ cents: this.props.cents + other.cents, currency: this.props.currency });
  }

  /**
   * Subtract another Money value from this one.
   * @param other - Money value to subtract
   * @returns New Money object with the difference
   */
  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money({ cents: this.props.cents - other.cents, currency: this.props.currency });
  }

  /** Check if the amount is negative (cents < 0) */
  isNegative(): boolean {
    return this.props.cents < 0;
  }

  /** Check if the amount is zero (cents === 0) */
  isZero(): boolean {
    return this.props.cents === 0;
  }

  /** Check if this amount is greater than another */
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
