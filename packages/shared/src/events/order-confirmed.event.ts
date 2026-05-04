import type { DomainEvent } from '../domain/domain-event';

export interface OrderConfirmedData {
  orderId: string;
  confirmedAt: string;
}

export interface OrderConfirmedEvent extends DomainEvent {
  eventType: 'order.confirmed';
  data: OrderConfirmedData;
}
