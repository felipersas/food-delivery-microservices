import type { RabbitMQConnection } from '@app/messaging';
import type { EventPublisher } from '@app/messaging';
import type { DomainEvent } from '@app/shared';

export class AuthEventPublisher implements EventPublisher {
  constructor(private readonly connection: RabbitMQConnection) {}

  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.connection.publish(event.eventType, event);
    }
  }
}
