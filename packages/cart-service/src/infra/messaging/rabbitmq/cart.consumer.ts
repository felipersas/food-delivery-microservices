import { Injectable, Inject, Logger } from '@nestjs/common';
import type { RabbitMQConnection } from '@app/messaging';
import type { DomainEvent } from '@app/shared';
import type { CartRepository } from '../../../domain/repositories/cart.repository.interface';
import { CART_REPOSITORY } from '../../../tokens';

interface MenuItemEventData {
  menuItemId: string;
  restaurantId: string;
}

@Injectable()
export class CartConsumer {
  private readonly logger = new Logger(CartConsumer.name);

  constructor(
    @Inject('RABBITMQ_CONNECTION') private readonly connection: RabbitMQConnection,
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe('menu-item.unavailable', ['menu-item.unavailable'], this.handleMenuItemUnavailable.bind(this));
    await this.connection.subscribe('menu-item.deleted', ['menu-item.deleted'], this.handleMenuItemDeleted.bind(this));
  }

  private async handleMenuItemUnavailable(event: DomainEvent) {
    const data = event.data as MenuItemEventData;
    this.logger.warn(`Menu item ${data.menuItemId} is now unavailable. Removing from active carts.`);

    await this.removeMenuItemFromCarts(data.menuItemId);
  }

  private async handleMenuItemDeleted(event: DomainEvent) {
    const data = event.data as MenuItemEventData;
    this.logger.warn(`Menu item ${data.menuItemId} was deleted. Removing from active carts.`);

    await this.removeMenuItemFromCarts(data.menuItemId);
  }

  private async removeMenuItemFromCarts(menuItemId: string): Promise<void> {
    try {
      const activeCarts = await this.cartRepository.findAllActive();

      for (const cart of activeCarts) {
        const hasItem = cart.getItems().some((item) => item.productId === menuItemId);

        if (hasItem) {
          try {
            cart.removeItem(menuItemId);
            await this.cartRepository.save(cart);
            this.logger.log(`Removed item ${menuItemId} from cart ${cart.getId()}`);
          } catch (error) {
            this.logger.error(`Failed to remove item from cart ${cart.getId()}:`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to process menu item change:', error);
    }
  }
}
