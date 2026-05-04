import type { DomainEvent } from '../domain/domain-event';

export interface OrderReadyData {
  orderId: string;
  kitchenTicketId: string;
  readyAt: string;
}

export interface OrderReadyEvent extends DomainEvent {
  eventType: 'order.ready';
  data: OrderReadyData;
}
