import { Inject, Injectable, Logger } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import { CreateOrderFromCartUseCase } from '@application/use-cases/create-order-from-cart/create-order-from-cart.use-case';
import { RABBITMQ_CONNECTION } from '../../../tokens';

/**
 * Cart Event Consumer
 *
 * Listens to cart-related events from the Cart Service
 * and creates orders when carts are checked out.
 *
 * Events:
 * - cart.checked-out: Triggers order creation
 */
@Injectable()
export class CartConsumer {
  private readonly logger = new Logger(CartConsumer.name);

  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    private readonly createOrderFromCartUseCase: CreateOrderFromCartUseCase,
  ) {}

  async start(): Promise<void> {
    this.logger.log('Starting cart event consumer...');

    await this.connection.subscribe(
      'order-service-cart-events',
      ['cart.checked-out'],
      async (event: DomainEvent) => {
        this.logger.log(
          `Received event: ${event.eventType} for cart: ${event.aggregateId}`,
        );

        const data = event.data as {
          cartId: string;
          customerId: string;
          restaurantId: string;
          items: Array<{
            productId: string;
            productName: string;
            quantity: number;
            priceCents: number;
          }>;
          totalAmountCents: number;
        };

        try {
          const result = await this.createOrderFromCartUseCase.execute({
            cartId: data.cartId,
            customerId: data.customerId,
            restaurantId: data.restaurantId,
            items: data.items.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              quantity: item.quantity,
              priceCents: item.priceCents,
            })),
            totalAmountCents: data.totalAmountCents,
          });

          this.logger.log(
            `Order created from cart: ${data.cartId} → order: ${result.orderId}`,
          );
        } catch (error) {
          this.logger.error(
            `Failed to create order from cart: ${data.cartId}`,
            error,
          );
        }
      },
    );

    this.logger.log('Cart event consumer started successfully');
  }
}
