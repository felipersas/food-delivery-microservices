import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import type { EventPublisher } from '@application/use-cases/create-order/create-order.use-case';

export class RabbitMQEventPublisher implements EventPublisher {
  constructor(private readonly connection: RabbitMQConnection) {}

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      const routingKey = event.eventType;
      await this.connection.publish(routingKey, event);
    }
  }
}
