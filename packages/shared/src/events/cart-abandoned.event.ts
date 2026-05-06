import type { DomainEvent } from '../domain/domain-event';

export interface CartAbandonedData {
  cartId: string;
  customerId: string;
}

export interface CartAbandonedEvent extends DomainEvent {
  eventType: 'cart.abandoned';
  data: CartAbandonedData;
}
