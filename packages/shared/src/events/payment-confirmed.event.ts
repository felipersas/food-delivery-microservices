import type { DomainEvent } from '../domain/domain-event';

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
}

export interface PaymentConfirmedData {
  orderId: string;
  paymentId: string;
  amount: number;
  method: string;
  restaurantId: string;
  items: OrderItem[];
}

export interface PaymentConfirmedEvent extends DomainEvent {
  eventType: 'payment.confirmed';
  data: PaymentConfirmedData;
}
