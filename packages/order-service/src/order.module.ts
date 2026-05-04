import { Module } from '@nestjs/common';
import { OrderController } from './infra/http/order.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order/get-order.use-case';
import { InMemoryOrderRepository } from './infra/database/memory/order.repository';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/order-event.publisher';

@Module({
  controllers: [OrderController],
  providers: [
    {
      provide: 'OrderRepository',
      useClass: InMemoryOrderRepository,
    },
    {
      provide: 'EventPublisher',
      useClass: RabbitMQEventPublisher,
    },
    CreateOrderUseCase,
    GetOrderUseCase,
  ],
})
export class OrderModule {}
