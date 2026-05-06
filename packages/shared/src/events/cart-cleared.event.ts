import type { DomainEvent } from '../domain/domain-event';

export interface CartClearedData {
  cartId: string;
  customerId: string;
}

export interface CartClearedEvent extends DomainEvent {
  eventType: 'cart.cleared';
  data: CartClearedData;
}
