import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import { RABBITMQ_CONNECTION, RESTAURANT_REPOSITORY } from '../../../tokens';

@Injectable()
export class RestaurantConsumer {
  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    @Inject(RESTAURANT_REPOSITORY) private readonly restaurantRepository: RestaurantRepository,
  ) {}

  async start(): Promise<void> {
    console.log('[RestaurantConsumer] Started (no event subscriptions yet)');
  }
}
