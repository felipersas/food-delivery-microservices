import { Inject, Injectable } from '@nestjs/common';
import type { RabbitMQConnection } from '@app/messaging';
import type { PriceCacheService } from '../../../application/services/price-cache.service';
import type { DomainEvent } from '@app/shared';
import { RABBITMQ_CONNECTION, PRICE_CACHE_SERVICE } from '../../../tokens';

const PRICE_UPDATED_QUEUE = 'cart:price-updated';
const PRICE_UPDATED_ROUTING_KEY = 'price.updated';

@Injectable()
export class PriceChangeConsumer {
  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    @Inject(PRICE_CACHE_SERVICE) private readonly priceCacheService: PriceCacheService,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      PRICE_UPDATED_QUEUE,
      [PRICE_UPDATED_ROUTING_KEY],
      async (msg: DomainEvent) => {
        await this.handlePriceUpdated(msg);
      },
    );
  }

  private async handlePriceUpdated(event: DomainEvent): Promise<void> {
    const { menuItemId } = event.data as { menuItemId: string };

    // Invalidate cache entry for the updated menu item
    await this.priceCacheService.invalidateItem(menuItemId);
  }
}
