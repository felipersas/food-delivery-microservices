import { ValueObject } from '@app/shared';
import { InvalidStateException } from '@app/shared';

export interface CustomerAddressProps {
  street: string;
  number: string;
  complement?: string;
  city: string;
  state: string;
  zipCode: string;
  isDefault: boolean;
}

export class CustomerAddress extends ValueObject<CustomerAddressProps> {
  private constructor(props: CustomerAddressProps) {
    super(props);
  }

  static create(props: CustomerAddressProps): CustomerAddress {
    CustomerAddress.validate(props);
    return new CustomerAddress(props);
  }

  private static validate(props: CustomerAddressProps): void {
    if (!props.street || props.street.trim().length === 0) {
      throw new InvalidStateException('Street is required');
    }
    if (!props.number || props.number.trim().length === 0) {
      throw new InvalidStateException('Number is required');
    }
    if (!props.city || props.city.trim().length === 0) {
      throw new InvalidStateException('City is required');
    }
    if (!props.state || props.state.trim().length !== 2) {
      throw new InvalidStateException('State must be 2 characters');
    }
    if (!CustomerAddress.isValidBrazilianZipCode(props.zipCode)) {
      throw new InvalidStateException('Invalid Brazilian zip code format. Use XXXXX-XXX');
    }
  }

  private static isValidBrazilianZipCode(zipCode: string): boolean {
    return /^\d{5}-\d{3}$/.test(zipCode);
  }

  get street(): string {
    return this.props.street;
  }

  get number(): string {
    return this.props.number;
  }

  get complement(): string | undefined {
    return this.props.complement;
  }

  get city(): string {
    return this.props.city;
  }

  get state(): string {
    return this.props.state;
  }

  get zipCode(): string {
    return this.props.zipCode;
  }

  get isDefault(): boolean {
    return this.props.isDefault;
  }

  makeDefault(): CustomerAddress {
    return CustomerAddress.create({
      ...this.props,
      isDefault: true,
    });
  }

  removeDefault(): CustomerAddress {
    return CustomerAddress.create({
      ...this.props,
      isDefault: false,
    });
  }
}
