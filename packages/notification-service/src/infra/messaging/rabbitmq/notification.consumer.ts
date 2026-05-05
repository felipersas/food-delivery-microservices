import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { RABBITMQ_CONNECTION } from '../../../tokens';

@Injectable()
export class NotificationConsumer {
  constructor(@Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'notification-service-events',
      ['order.#', 'payment.#'],
      async (event: DomainEvent) => {
        switch (event.eventType) {
          case 'order.created':
            console.log(`[Notification] New order: ${event.aggregateId}`);
            break;
          case 'payment.confirmed':
            console.log(`[Notification] Payment confirmed for order: ${(event.data as any).orderId}`);
            break;
          case 'payment.rejected':
            console.log(`[Notification] Payment rejected for order: ${(event.data as any).orderId}`);
            break;
          case 'order.ready':
            console.log(`[Notification] Order ready: ${(event.data as any).orderId}`);
            break;
        }
      },
    );
  }
}
