import type { DomainEvent } from '../domain/domain-event';

export interface CartItemUpdatedData {
  cartId: string;
  customerId: string;
  productId: string;
  quantity: number;
}

export interface CartItemUpdatedEvent extends DomainEvent {
  eventType: 'cart.item-updated';
  data: CartItemUpdatedData;
}
