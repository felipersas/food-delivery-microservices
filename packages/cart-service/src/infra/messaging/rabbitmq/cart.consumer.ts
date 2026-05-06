import { OnModuleInit, Injectable, Inject } from '@nestjs/common';
import type { RabbitMQConnection } from '@app/messaging';
import type { DomainEvent } from '@app/shared';

@Injectable()
export class CartConsumer implements OnModuleInit {
  constructor(@Inject('RABBITMQ_CONNECTION') private readonly connection: RabbitMQConnection) {}

  async onModuleInit() {
    // Subscribe to menu-item events
    await this.connection.subscribe('menu-item.unavailable', this.handleMenuItemUnavailable.bind(this));
    await this.connection.subscribe('menu-item.deleted', this.handleMenuItemDeleted.bind(this));
  }

  private async handleMenuItemUnavailable(event: DomainEvent) {
    // Implementation: Remove unavailable items from all active carts
    console.log('[CartConsumer] Menu item unavailable:', event.data);
  }

  private async handleMenuItemDeleted(event: DomainEvent) {
    // Implementation: Remove deleted items from all active carts
    console.log('[CartConsumer] Menu item deleted:', event.data);
  }
}
