import { Inject, Injectable, Logger } from '@nestjs/common';
import { Money } from '@app/shared';
import { Order } from '@domain/aggregates/order.aggregate';
import { OrderItem } from '@domain/value-objects/order-item.vo';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import type { EventPublisher } from '@infra/messaging/rabbitmq/order-event.publisher';
import type {
  CreateOrderFromCartInput,
  CreateOrderFromCartOutput,
} from './create-order-from-cart.dto';
import { ORDER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class CreateOrderFromCartUseCase {
  private readonly logger = new Logger(CreateOrderFromCartUseCase.name);

  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    input: CreateOrderFromCartInput,
  ): Promise<CreateOrderFromCartOutput> {
    this.logger.log(
      `Creating order from cart: ${input.cartId} for customer: ${input.customerId}`,
    );

    const items = input.items.map((item) =>
      OrderItem.create({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Money.BRLFromCents(item.priceCents),
      }),
    );

    const order = Order.create({
      customerId: input.customerId,
      restaurantId: input.restaurantId,
      items,
      // Payment method will be handled separately via payment flow
    });

    await this.orderRepository.save(order);

    const events = order.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    order.clearDomainEvents();

    this.logger.log(
      `Order created: ${order.getId()} from cart: ${input.cartId}`,
    );

    return {
      orderId: order.getId(),
      status: order.getStatus(),
    };
  }
}
