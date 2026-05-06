import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';

export interface EventPublisher {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

export class RabbitMQEventPublisher implements EventPublisher {
  constructor(private readonly connection: RabbitMQConnection) {}

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      const routingKey = event.eventType;
      await this.connection.publish(routingKey, event);
    }
  }
}
