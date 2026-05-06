import type { DomainEvent } from '../domain/domain-event';

export interface CartItemAddedData {
  cartId: string;
  customerId: string;
  productId: string;
  quantity: number;
  restaurantId: string;
}

export interface CartItemAddedEvent extends DomainEvent {
  eventType: 'cart.item-added';
  data: CartItemAddedData;
}
