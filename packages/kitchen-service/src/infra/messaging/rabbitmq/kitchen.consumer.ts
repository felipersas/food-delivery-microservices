import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { KitchenTicket } from '../../../domain/aggregates/kitchen-ticket.aggregate';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class KitchenConsumer {
  constructor(@Inject('RabbitMQConnection') private readonly connection: RabbitMQConnection) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'kitchen-service-orders',
      ['order.created'],
      async (event: DomainEvent) => {
        const data = event.data as any;

        const ticket = KitchenTicket.createFromOrder({
          orderId: data.orderId,
          items: data.items,
        });

        ticket.startPreparing();

        // Simulate preparation
        ticket.markReady();

        const readyEvent: DomainEvent = {
          eventId: uuidv4(),
          eventType: 'order.ready',
          occurredAt: new Date().toISOString(),
          aggregateId: ticket.getId(),
          aggregateType: 'KitchenTicket',
          data: {
            orderId: data.orderId,
            kitchenTicketId: ticket.getId(),
            readyAt: new Date().toISOString(),
          },
        };

        await this.connection.publish('order.ready', readyEvent);
      },
    );
  }
}
