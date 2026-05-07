import { ValueObject, Money, DomainException } from '@app/shared';

export interface OrderItemProps {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
}

export class OrderItem extends ValueObject<OrderItemProps> {
  private constructor(props: OrderItemProps) {
    super(props);
  }

  static create(props: OrderItemProps): OrderItem {
    OrderItem.validate(props);
    return new OrderItem(props);
  }

  private static validate(props: OrderItemProps): void {
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
    if (props.unitPrice.isZero()) {
      throw new DomainException('Unit price must be greater than zero');
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

  getTotal(): Money {
    return Money.BRL(this.props.unitPrice.amount * this.props.quantity);
  }
}
