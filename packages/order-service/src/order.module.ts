import { Module, type OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderController } from './infra/http/order.controller';
import { CreateOrderUseCase } from './application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from './application/use-cases/get-order/get-order.use-case';
import { InMemoryOrderRepository } from './infra/database/memory/order.repository';
import { PostgresOrderRepository } from './infra/database/typeorm/repositories/order.repository.impl';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/order-event.publisher';
import { OrderConsumer } from './infra/messaging/rabbitmq/order.consumer';
import { RabbitMQConnection } from '@app/messaging';
import { OrderEntity } from './infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from './infra/database/typeorm/entities/order-item.entity';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: usePostgres
    ? [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/orders',
          entities: [OrderEntity, OrderItemEntity],
          synchronize: process.env.NODE_ENV !== 'production',
        }),
      ]
    : [],
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
