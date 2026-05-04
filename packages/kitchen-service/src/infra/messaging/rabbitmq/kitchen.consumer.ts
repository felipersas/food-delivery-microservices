import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { KitchenQueue } from '@infra/queue/kitchen.queue';

@Injectable()
export class KitchenConsumer {
  private kitchenQueue: KitchenQueue;

  constructor(
    @Inject('RabbitMQConnection') private readonly connection: RabbitMQConnection,
    @Inject('KitchenQueue') kitchenQueue: KitchenQueue,
  ) {
    this.kitchenQueue = kitchenQueue;
  }

  async start(): Promise<void> {
    await this.connection.subscribe(
      'kitchen-service-orders',
      ['order.created'],
      async (event: DomainEvent) => {
        const data = event.data as any;

        await this.kitchenQueue.addJob({
          orderId: data.orderId,
          items: data.items,
        });
      },
    );
  }
}
