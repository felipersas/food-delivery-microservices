import { ValueObject, DomainException } from '@app/shared';

export interface KitchenTicketItemProps {
  productId: string;
  productName: string;
  quantity: number;
}

export class KitchenTicketItem extends ValueObject<KitchenTicketItemProps> {
  private constructor(props: KitchenTicketItemProps) {
    super(props);
  }

  static create(props: KitchenTicketItemProps): KitchenTicketItem {
    KitchenTicketItem.validate(props);
    return new KitchenTicketItem(props);
  }

  private static validate(props: KitchenTicketItemProps): void {
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

  toPlain(): { productId: string; productName: string; quantity: number } {
    return {
      productId: this.props.productId,
      productName: this.props.productName,
      quantity: this.props.quantity,
    };
  }
}
