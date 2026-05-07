import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { validationSchema } from './config/validation';
import configuration from './config/configuration';
import {
  AllExceptionsFilter,
  SuccessResponseInterceptor,
  RolesGuard,
} from '@app/shared';
import { CartController } from './infra/http/cart.controller';
import { HealthController } from './infra/http/health.controller';
import { CartConsumer } from './infra/messaging/rabbitmq/cart.consumer';
import { PriceChangeConsumer } from './infra/messaging/rabbitmq/price.consumer';
import { RedisModule } from './config/redis.config';
import { RestaurantServiceClientModule } from './infra/trpc/restaurant-service.client.module';
import { RestaurantServiceClient } from './infra/trpc/restaurant-service.client';
import { PriceCacheService } from './application/services/price-cache.service';
import { GetCartUseCase } from './application/use-cases/get-cart/get-cart.use-case';
import { AddItemUseCase } from './application/use-cases/add-item/add-item.use-case';
import { RemoveItemUseCase } from './application/use-cases/remove-item/remove-item.use-case';
import { UpdateQuantityUseCase } from './application/use-cases/update-quantity/update-quantity.use-case';
import { ClearCartUseCase } from './application/use-cases/clear-cart/clear-cart.use-case';
import { CheckoutCartUseCase } from './application/use-cases/checkout-cart/checkout-cart.use-case';
import { InMemoryCartRepository } from './infra/database/memory/cart.repository';
import { PostgresCartRepository } from './infra/database/typeorm/repositories/cart.repository.impl';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/cart-event.publisher';
import { RabbitMQConnection } from '@app/messaging';
import { CartEntity } from './infra/database/typeorm/entities/cart.entity';
import {
  CART_REPOSITORY,
  EVENT_PUBLISHER,
  PRICE_CACHE_SERVICE,
  RABBITMQ_CONNECTION,
  RESTAURANT_SERVICE_CLIENT,
} from './tokens';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    RedisModule,
    RestaurantServiceClientModule,
    ...(usePostgres
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            url:
              process.env.CART_DATABASE_URL ??
              'postgres://postgres:postgres@localhost:5439/carts',
            entities: [CartEntity],
            synchronize: process.env.NODE_ENV !== 'production',
          }),
        ]
      : []),
  ],
  controllers: [CartController, HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: (configService: ConfigService) => {
        return new RabbitMQConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: CART_REPOSITORY,
      useFactory: () => {
        return usePostgres ? PostgresCartRepository : InMemoryCartRepository;
      },
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (conn: RabbitMQConnection) =>
        new RabbitMQEventPublisher(conn),
      inject: [RABBITMQ_CONNECTION],
    },
    {
      provide: RESTAURANT_SERVICE_CLIENT,
      useClass: RestaurantServiceClient,
    },
    {
      provide: PRICE_CACHE_SERVICE,
      useClass: PriceCacheService,
    },
    GetCartUseCase,
    AddItemUseCase,
    RemoveItemUseCase,
    UpdateQuantityUseCase,
    ClearCartUseCase,
    CheckoutCartUseCase,
    CartConsumer,
    PriceChangeConsumer,
  ],
})
export class CartModule implements OnModuleInit {
  constructor(
    private readonly cartConsumer: CartConsumer,
    private readonly priceChangeConsumer: PriceChangeConsumer,
  ) {}

  async onModuleInit() {
    await this.cartConsumer.start();
    await this.priceChangeConsumer.start();
  }
}
