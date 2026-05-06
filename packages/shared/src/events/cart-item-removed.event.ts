import type { DomainEvent } from '../domain/domain-event';

export interface CartItemRemovedData {
  cartId: string;
  customerId: string;
  productId: string;
}

export interface CartItemRemovedEvent extends DomainEvent {
  eventType: 'cart.item-removed';
  data: CartItemRemovedData;
}
