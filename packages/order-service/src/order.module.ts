import { Module } from '@nestjs/common';
import { OrderController } from './infra/http/order.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order/get-order.use-case';
import { InMemoryOrderRepository } from './infra/database/memory/order.repository';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/order-event.publisher';
import { RabbitMQConnection } from '@app/messaging';

@Module({
  controllers: [OrderController],
  providers: [
    {
      provide: 'RabbitMQConnection',
      useFactory: () =>
        new RabbitMQConnection({
          url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
          exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
        }),
    },
    {
      provide: 'OrderRepository',
      useClass: InMemoryOrderRepository,
    },
    {
      provide: 'EventPublisher',
      useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
      inject: ['RabbitMQConnection'],
    },
    CreateOrderUseCase,
    GetOrderUseCase,
  ],
})
export class OrderModule {}
