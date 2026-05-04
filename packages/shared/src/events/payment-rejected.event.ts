import type { DomainEvent } from '../domain/domain-event';

export interface PaymentRejectedData {
  orderId: string;
  paymentId: string;
  reason: string;
}

export interface PaymentRejectedEvent extends DomainEvent {
  eventType: 'payment.rejected';
  data: PaymentRejectedData;
}
