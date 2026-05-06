import { ValueObject, InvalidStateException } from '@app/shared';

export enum CartStatusEnum {
  ACTIVE = 'active',
  CHECKED_OUT = 'checked_out',
  ABANDONED = 'abandoned',
}

export class CartStatus extends ValueObject<{ value: CartStatusEnum }> {
  private constructor(value: CartStatusEnum) {
    super({ value });
  }

  static fromString(value: string): CartStatus {
    const enumValue = Object.values(CartStatusEnum).includes(value as CartStatusEnum)
      ? (value as CartStatusEnum)
      : CartStatusEnum.ACTIVE;
    return new CartStatus(enumValue);
  }

  static active(): CartStatus {
    return new CartStatus(CartStatusEnum.ACTIVE);
  }

  static checkedOut(): CartStatus {
    return new CartStatus(CartStatusEnum.CHECKED_OUT);
  }

  static abandoned(): CartStatus {
    return new CartStatus(CartStatusEnum.ABANDONED);
  }

  get enumValue(): CartStatusEnum {
    return this.props.value;
  }

  canTransitionTo(newStatus: CartStatus): boolean {
    const transitions: Record<CartStatusEnum, CartStatusEnum[]> = {
      [CartStatusEnum.ACTIVE]: [CartStatusEnum.CHECKED_OUT, CartStatusEnum.ABANDONED],
      [CartStatusEnum.CHECKED_OUT]: [],
      [CartStatusEnum.ABANDONED]: [],
    };
    return transitions[this.enumValue]?.includes(newStatus.enumValue) ?? false;
  }

  transitionTo(newStatus: CartStatus): void {
    if (!this.canTransitionTo(newStatus)) {
      throw new InvalidStateException(
        `Cannot transition from ${this.enumValue} to ${newStatus.enumValue}`,
      );
    }
  }
}
