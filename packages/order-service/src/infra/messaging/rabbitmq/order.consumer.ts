import { Injectable, Inject, Logger } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import { RABBITMQ_CONNECTION, ORDER_REPOSITORY } from '../../../tokens';

@Injectable()
export class OrderConsumer {
  private readonly logger = new Logger(OrderConsumer.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'order-service-events',
      ['payment.confirmed', 'payment.rejected', 'order.ready'],
      async (event: DomainEvent) => {
        this.logger.debug(`Received event: ${event.eventType}`);
        const data = event.data as any;
        const orderId = data.orderId;

        const order = await this.orderRepository.findById(orderId);
        if (!order) {
          this.logger.error(`Order not found: ${orderId}`);
          return;
        }

        switch (event.eventType) {
          case 'payment.confirmed':
            order.confirm();
            break;
          case 'payment.rejected':
            order.cancel();
            break;
          case 'order.ready':
            order.markReady();
            break;
        }

        await this.orderRepository.save(order);
        order.clearDomainEvents();
        this.logger.log(`Order ${orderId} updated to ${order.getStatus()}`);
      },
    );
  }
}
