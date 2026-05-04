import type { DomainEvent } from '@app/shared';
import type { EventPublisher } from '../../../application/use-cases/create-order/create-order.use-case';

export class RabbitMQEventPublisher implements EventPublisher {
  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    // TODO: implement real RabbitMQ publishing via amqp-connection-manager
    // For now, just log
    for (const event of events) {
      console.log(`[EventPublisher] Publishing ${event.eventType}`, event);
    }
  }
}
