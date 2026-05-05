import { ValueObject } from '@app/shared';
import { InvalidStateException } from '@app/shared';

export type PaymentMethodBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'discover';

export interface PaymentMethodProps {
  token: string; // Last 4 digits only, NEVER store full card number
  brand: PaymentMethodBrand;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export class PaymentMethod extends ValueObject<PaymentMethodProps> {
  private constructor(props: PaymentMethodProps) {
    super(props);
  }

  static create(props: PaymentMethodProps): PaymentMethod {
    PaymentMethod.validate(props);
    return new PaymentMethod(props);
  }

  private static validate(props: PaymentMethodProps): void {
    if (!props.token || props.token.length !== 4) {
      throw new InvalidStateException('Token must be last 4 digits (4 characters)');
    }
    if (!/^\d{4}$/.test(props.token)) {
      throw new InvalidStateException('Token must contain only digits');
    }
    if (!PaymentMethod.isValidBrand(props.brand)) {
      throw new InvalidStateException(`Invalid payment brand: ${props.brand}`);
    }
    if (props.expiryMonth < 1 || props.expiryMonth > 12) {
      throw new InvalidStateException('Expiry month must be between 1 and 12');
    }
    const currentYear = new Date().getFullYear();
    if (props.expiryYear < currentYear || props.expiryYear > currentYear + 20) {
      throw new InvalidStateException(`Expiry year must be between ${currentYear} and ${currentYear + 20}`);
    }
    PaymentMethod.validateNotExpired(props.expiryMonth, props.expiryYear);
  }

  private static isValidBrand(brand: string): brand is PaymentMethodBrand {
    return ['visa', 'mastercard', 'amex', 'elo', 'hipercard', 'discover'].includes(brand);
  }

  private static validateNotExpired(month: number, year: number): void {
    const now = new Date();
    const expiry = new Date(year, month - 1);
    if (expiry < now) {
      throw new InvalidStateException('Payment method is expired');
    }
  }

  get token(): string {
    return this.props.token;
  }

  get brand(): PaymentMethodBrand {
    return this.props.brand;
  }

  get expiryMonth(): number {
    return this.props.expiryMonth;
  }

  get expiryYear(): number {
    return this.props.expiryYear;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  get displayValue(): string {
    return `${this.brand.toUpperCase()} •••• ${this.token}`;
  }

  makeDefault(): PaymentMethod {
    return PaymentMethod.create({
      ...this.props,
      isDefault: true,
    });
  }

  removeDefault(): PaymentMethod {
    return PaymentMethod.create({
      ...this.props,
      isDefault: false,
    });
  }
}
