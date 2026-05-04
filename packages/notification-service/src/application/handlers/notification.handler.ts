import type { DomainEvent } from '@app/shared';

export class NotificationHandler {
  async handle(event: DomainEvent): Promise<void> {
    switch (event.eventType) {
      case 'order.created':
        console.log(`[Notification] New order created: ${event.aggregateId}`);
        break;
      case 'payment.confirmed':
        console.log(`[Notification] Payment confirmed for order: ${(event.data as any).orderId}`);
        break;
      case 'payment.rejected':
        console.log(`[Notification] Payment rejected for order: ${(event.data as any).orderId}`);
        break;
      case 'order.ready':
        console.log(`[Notification] Order ready for pickup: ${(event.data as any).orderId}`);
        break;
      default:
        console.log(`[Notification] Unhandled event: ${event.eventType}`);
    }
  }
}
