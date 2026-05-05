import type { DomainEvent } from '../domain/domain-event';

export interface PaymentRefundInitiatedData {
  paymentId: string;
  orderId: string;
  amount: number;
  reason: string;
}

export interface PaymentRefundCompletedData {
  paymentId: string;
  orderId: string;
  customerId?: string;
  refundedAmount: number;
  refundId: string;
  reason: string;
}

export interface PaymentRefundFailedData {
  paymentId: string;
  orderId: string;
  reason: string;
}

export type PaymentRefundInitiatedEvent = DomainEvent & {
  eventType: 'payment.refund.initiated';
  data: PaymentRefundInitiatedData;
};

export type PaymentRefundCompletedEvent = DomainEvent & {
  eventType: 'payment.refund.completed';
  data: PaymentRefundCompletedData;
};

export type PaymentRefundFailedEvent = DomainEvent & {
  eventType: 'payment.refund.failed';
  data: PaymentRefundFailedData;
};
