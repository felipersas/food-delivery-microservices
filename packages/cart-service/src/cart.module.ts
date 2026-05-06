import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { validationSchema } from './config/validation';
import configuration from './config/configuration';
import { AllExceptionsFilter, SuccessResponseInterceptor, RolesGuard } from '@app/shared';
import { CartController } from './infra/http/cart.controller';
import { HealthController } from './infra/http/health.controller';
import { CartConsumer } from './infra/messaging/rabbitmq/cart.consumer';
import { PriceChangeConsumer } from './infra/messaging/rabbitmq/price.consumer';
import { RedisModule } from './config/redis.config';
import { PriceCacheService } from './application/services/price-cache.service';
import { GetCartUseCase } from './application/use-cases/get-cart/get-cart.use-case';
import { AddItemUseCase } from './application/use-cases/add-item/add-item.use-case';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    RedisModule,
    ...(usePostgres ? [TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.CART_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5439/carts',
      entities: [usePostgres ? require('./infra/database/typeorm/entities/cart.entity').CartEntity : []],
      synchronize: process.env.NODE_ENV !== 'production',
    })] : []),
  ],
  controllers: [CartController, HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
    { provide: APP_GUARD, useClass: RolesGuard },
    {
      provide: 'RABBITMQ_CONNECTION',
      useFactory: (configService: ConfigService) => {
        const { MessagingFactory } = require('@app/messaging');
        return MessagingFactory.createConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: 'CART_REPOSITORY',
      useFactory: () => {
        const { InMemoryCartRepository } = require('./infra/database/memory/cart.repository');
        const { PostgresCartRepository } = require('./infra/database/typeorm/repositories/cart.repository.impl');
        return usePostgres ? PostgresCartRepository : InMemoryCartRepository;
      },
    },
    {
      provide: 'EVENT_PUBLISHER',
      useFactory: (connection: any) => {
        const { RabbitMQEventPublisher } = require('./infra/messaging/rabbitmq/cart-event.publisher');
        return new RabbitMQEventPublisher(connection);
      },
      inject: ['RABBITMQ_CONNECTION'],
    },
    {
      provide: 'PRICE_CACHE_SERVICE',
      useClass: PriceCacheService,
    },
    GetCartUseCase,
    AddItemUseCase,
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
