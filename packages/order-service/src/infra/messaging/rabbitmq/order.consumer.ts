import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import type { OrderRepository } from '../../../domain/repositories/order.repository.interface';

@Injectable()
export class OrderConsumer {
  constructor(
    @Inject('RabbitMQConnection') private readonly connection: RabbitMQConnection,
    @Inject('OrderRepository') private readonly orderRepository: OrderRepository,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'order-service-events',
      ['payment.confirmed', 'order.ready'],
      async (event: DomainEvent) => {
        const data = event.data as any;
        const orderId = data.orderId;

        const order = await this.orderRepository.findById(orderId);
        if (!order) {
          console.error(`[OrderConsumer] Order not found: ${orderId}`);
          return;
        }

        switch (event.eventType) {
          case 'payment.confirmed':
            order.confirm();
            break;
          case 'order.ready':
            if (order.getStatus() === 'PENDING') {
              order.confirm();
            }
            order.startPreparing();
            order.markReady();
            break;
        }

        order.clearDomainEvents();
        await this.orderRepository.save(order);
      },
    );
  }
}
