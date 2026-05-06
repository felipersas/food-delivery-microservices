import { ValueObject, InvalidStateException } from '@app/shared';

export interface RestaurantAddressProps {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  latitude?: number;
  longitude?: number;
}

export class RestaurantAddress extends ValueObject<RestaurantAddressProps> {
  private constructor(props: RestaurantAddressProps) {
    super(props);
  }

  static create(props: RestaurantAddressProps): RestaurantAddress {
    RestaurantAddress.validate(props);
    return new RestaurantAddress(props);
  }

  private static validate(props: RestaurantAddressProps): void {
    if (!props.street || props.street.trim().length === 0) {
      throw new InvalidStateException('Street is required');
    }
    if (!props.number || props.number.trim().length === 0) {
      throw new InvalidStateException('Number is required');
    }
    if (!props.neighborhood || props.neighborhood.trim().length === 0) {
      throw new InvalidStateException('Neighborhood is required');
    }
    if (!props.city || props.city.trim().length === 0) {
      throw new InvalidStateException('City is required');
    }
    if (!props.state || props.state.trim().length !== 2) {
      throw new InvalidStateException('State must be 2 characters');
    }
    if (!RestaurantAddress.isValidBrazilianZipCode(props.zipCode)) {
      throw new InvalidStateException('Invalid Brazilian zip code format. Use XXXXX-XXX');
    }
    if (props.latitude !== undefined) {
      if (props.latitude < -90 || props.latitude > 90) {
        throw new InvalidStateException('Latitude must be between -90 and 90');
      }
    }
    if (props.longitude !== undefined) {
      if (props.longitude < -180 || props.longitude > 180) {
        throw new InvalidStateException('Longitude must be between -180 and 180');
      }
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

  get neighborhood(): string {
    return this.props.neighborhood;
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

  get latitude(): number | undefined {
    return this.props.latitude;
  }

  get longitude(): number | undefined {
    return this.props.longitude;
  }

  hasLocation(): boolean {
    return this.props.latitude !== undefined && this.props.longitude !== undefined;
  }
}
