import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
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
import { AllExceptionsFilter } from '@app/shared';
import { OrderEntity } from './infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from './infra/database/typeorm/entities/order-item.entity';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

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
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: 'RabbitMQConnection',
      useFactory: (configService: ConfigService) =>
        new RabbitMQConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: 'OrderRepository',
      useClass: usePostgres ? PostgresOrderRepository : InMemoryOrderRepository,
    },
    {
      provide: 'EventPublisher',
      useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
      inject: ['RabbitMQConnection'],
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
