import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { validationSchema } from './config/validation';
import configuration from './config/configuration';
import { AllExceptionsFilter, SuccessResponseInterceptor } from '@app/shared';
import { CartController } from './infra/http/cart.controller';
import { HealthController } from './infra/http/health.controller';
import { CartConsumer } from './infra/messaging/rabbitmq/cart.consumer';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    ...(usePostgres ? [TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.CART_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5439/cart',
      entities: [usePostgres ? import('./infra/database/typeorm/entities/cart.entity') : []],
      synchronize: process.env.NODE_ENV !== 'production',
    })] : []),
  ],
  controllers: [CartController, HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
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
      useFactory: ('RABBITMQ_CONNECTION') => {
        const { RabbitMQEventPublisher } = require('./infra/messaging/rabbitmq/cart-event.publisher');
        return new RabbitMQEventPublisher(connection);
      },
    },
    { 
      provide: GetCartUseCase,
      useFactory: ('CART_REPOSITORY') => {
        const { GetCartUseCase } = require('./application/use-cases/get-cart/get-cart.use-case');
        return new GetCartUseCase(repository);
      },
    },
    CartConsumer,
  ],
})
export class CartModule {}
