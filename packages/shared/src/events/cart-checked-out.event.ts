import type { DomainEvent } from '../domain/domain-event';

export interface CartCheckoutItem {
  productId: string;
  productName: string;
  quantity: number;
  priceCents: number;
}

export interface CartCheckedOutData {
  cartId: string;
  customerId: string;
  restaurantId: string;
  items: CartCheckoutItem[];
  totalAmountCents: number;
}

export interface CartCheckedOutEvent extends DomainEvent {
  eventType: 'cart.checked-out';
  data: CartCheckedOutData;
}
