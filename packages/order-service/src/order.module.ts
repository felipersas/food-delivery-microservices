import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './infra/http/order.controller';
import { HealthController } from './infra/http/health.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order/get-order.use-case';
import { InMemoryOrderRepository } from './infra/database/memory/order.repository';
import { PostgresOrderRepository } from './infra/database/typeorm/repositories/order.repository.impl';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/order-event.publisher';
import { OrderConsumer } from './infra/messaging/rabbitmq/order.consumer';
import { RabbitMQConnection } from '@app/messaging';
import { AllExceptionsFilter, SuccessResponseInterceptor, RolesGuard } from '@app/shared';
import { OrderEntity } from './infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from './infra/database/typeorm/entities/order-item.entity';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import {
  RABBITMQ_CONNECTION,
  ORDER_REPOSITORY,
  EVENT_PUBLISHER,
} from './tokens';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    ...(usePostgres
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.ORDER_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/orders',
            entities: [OrderEntity, OrderItemEntity],
            synchronize: process.env.NODE_ENV !== 'production',
          }),
        ]
      : []),
  ],
  controllers: [OrderController, HealthController],
  providers: [
    Reflector,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SuccessResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RolesGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: (configService: ConfigService) =>
        new RabbitMQConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: usePostgres ? PostgresOrderRepository : InMemoryOrderRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
      inject: [RABBITMQ_CONNECTION],
    },
    CreateOrderUseCase,
    GetOrderUseCase,
    OrderConsumer,
  ],
})
export class OrderModule implements OnModuleInit {
  constructor(private readonly orderConsumer: OrderConsumer) {}

  async onModuleInit() {
    await this.orderConsumer.start();
  }
}
