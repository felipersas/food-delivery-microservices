import { ValueObject, Money } from '@app/shared';

export interface OrderItemProps {
  productId: string;
  productName: string;
  quantity: number;
  unitPrice: Money;
}

export class OrderItem extends ValueObject<OrderItemProps> {
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
    return this.props.unitPrice; // base for multiplication
  }
}
