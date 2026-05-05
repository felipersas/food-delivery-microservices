import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { KitchenQueue } from '@infra/queue/kitchen.queue';
import { RABBITMQ_CONNECTION, KITCHEN_QUEUE } from '../../../tokens';

@Injectable()
export class KitchenConsumer {
  private kitchenQueue: KitchenQueue;

  constructor(
    @Inject(RABBITMQ_CONNECTION)
    private readonly connection: RabbitMQConnection,
    @Inject(KITCHEN_QUEUE) kitchenQueue: KitchenQueue,
  ) {
    this.kitchenQueue = kitchenQueue;
  }

  async start(): Promise<void> {
    await this.connection.subscribe(
      'kitchen-service-payments',
      ['payment.confirmed'],
      async (event: DomainEvent) => {
        const data = event.data as any;

        console.log(
          `[KitchenConsumer] Received event: ${event.eventType}`,
          data,
        );
        await this.kitchenQueue.addJob({
          orderId: data.orderId,
          restaurantId: data.restaurantId,
          items: data.items,
        });

        console.log(
          `[KitchenConsumer] Ticket queued for order: ${data.orderId}, restaurant: ${data.restaurantId}`,
        );
      },
    );
  }
}
