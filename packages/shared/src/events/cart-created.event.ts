import type { DomainEvent } from '../domain/domain-event';

export interface CartCreatedData {
  cartId: string;
  customerId: string;
}

export interface CartCreatedEvent extends DomainEvent {
  eventType: 'cart.created';
  data: CartCreatedData;
}
