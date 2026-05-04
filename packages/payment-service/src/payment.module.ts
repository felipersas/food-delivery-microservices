import { Module, type OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment/process-payment.use-case';
import { PaymentConsumer } from './infra/messaging/rabbitmq/payment.consumer';
import { InMemoryPaymentRepository } from './infra/database/memory/payment.repository';
import { PostgresPaymentRepository } from './infra/database/typeorm/repositories/payment.repository.impl';
import { PaymentEntity } from './infra/database/typeorm/entities/payment.entity';
import { RabbitMQConnection } from '@app/messaging';
import type { PaymentRepository } from './domain/repositories/payment.repository.interface';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: usePostgres
    ? [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/payments',
          entities: [PaymentEntity],
          synchronize: process.env.NODE_ENV !== 'production',
        }),
      ]
    : [],
  providers: [
    {
      provide: 'PaymentRepository',
      useClass: usePostgres ? PostgresPaymentRepository : InMemoryPaymentRepository,
    },
    ProcessPaymentUseCase,
    {
      provide: 'RabbitMQConnection',
      useFactory: () =>
        new RabbitMQConnection({
          url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
          exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
        }),
    },
    PaymentConsumer,
  ],
})
export class PaymentModule implements OnModuleInit {
  constructor(private readonly consumer: PaymentConsumer) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
