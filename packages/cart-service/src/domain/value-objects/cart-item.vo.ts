import { ValueObject, Money, DomainException } from '@app/shared';

export interface CartItemProps {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
  restaurantId: string;
}

export class CartItem extends ValueObject<CartItemProps> {
  private constructor(props: CartItemProps) {
    super(props);
  }

  static create(props: CartItemProps): CartItem {
    CartItem.validate(props);
    return new CartItem(props);
  }

  private static validate(props: CartItemProps): void {
    if (!props.productId || props.productId.trim().length === 0) {
      throw new DomainException('Product ID is required');
    }
    if (!props.productName || props.productName.trim().length === 0) {
      throw new DomainException('Product name is required');
    }
    if (props.quantity <= 0) {
      throw new DomainException('Quantity must be positive');
    }
    if (props.quantity > 99) {
      throw new DomainException('Quantity cannot exceed 99');
    }
    if (!props.unitPrice) {
      throw new DomainException('Unit price is required');
    }
    if (props.unitPrice.amount <= 0) {
      throw new DomainException('Unit price must be greater than zero');
    }
    if (!props.restaurantId || props.restaurantId.trim().length === 0) {
      throw new DomainException('Restaurant ID is required');
    }
  }

  get productId(): string {
    return this.props.productId;
  }

  get productName(): string {
    return this.props.productName;
  }

  get quantity(): number {
    return this.props.quantity;
  }

  get unitPrice(): Money {
    return this.props.unitPrice;
  }

  get restaurantId(): string {
    return this.props.restaurantId;
  }

  getTotal(): Money {
    return Money.BRL(this.props.unitPrice.amount * this.props.quantity);
  }

  withQuantity(quantity: number): CartItem {
    return CartItem.create({
      ...this.props,
      quantity,
    });
  }
}
