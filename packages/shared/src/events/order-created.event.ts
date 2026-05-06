import type { DomainEvent } from '../domain/domain-event';

export interface OrderCreatedData {
  orderId: string;
  customerId: string;
  restaurantId: string;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    priceCents: number;
  }>;
  totalAmountCents: number;
  paymentMethodIndex?: number;
  paymentMethodType?: string;
}

export interface OrderCreatedEvent extends DomainEvent {
  eventType: 'order.created';
  data: OrderCreatedData;
}
