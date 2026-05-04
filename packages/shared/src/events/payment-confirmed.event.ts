import type { DomainEvent } from '../domain/domain-event';

export interface PaymentConfirmedData {
  orderId: string;
  paymentId: string;
  amount: number;
  method: string;
}

export interface PaymentConfirmedEvent extends DomainEvent {
  eventType: 'payment.confirmed';
  data: PaymentConfirmedData;
}
