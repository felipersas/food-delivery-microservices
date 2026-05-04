import { Money } from '@app/shared';
import type { DomainEvent } from '@app/shared';
import { Order } from '@domain/aggregates/order.aggregate';
import { OrderItem } from '@domain/value-objects/order-item.vo';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import type { CreateOrderInput, CreateOrderOutput } from './create-order.dto';

export interface EventPublisher {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

export class CreateOrderUseCase {
  constructor(
    private readonly orderRepository: OrderRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const items = input.items.map(
      (item) =>
        new OrderItem({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Money.BRL(item.price),
        }),
    );

    const order = Order.create({
      customerId: input.customerId,
      restaurantId: input.restaurantId,
      items,
    });

    await this.orderRepository.save(order);

    const events = order.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    order.clearDomainEvents();

    return {
      orderId: order.getId(),
      status: order.getStatus(),
      totalAmount: order.getTotalAmount().amount,
    };
  }
}
