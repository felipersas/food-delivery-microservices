import { Injectable, Inject, Logger } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { RABBITMQ_CONNECTION } from '../../../tokens';

@Injectable()
export class NotificationConsumer {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(@Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'notification-service-events',
      ['order.#', 'payment.#'],
      async (event: DomainEvent) => {
        this.logger.debug(`Received event: ${event.eventType} for ${event.aggregateId}`);
      },
    );
  }
}
