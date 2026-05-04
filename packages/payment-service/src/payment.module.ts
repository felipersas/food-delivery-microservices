import { Module, type OnModuleInit } from '@nestjs/common';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment/process-payment.use-case';
import { PaymentConsumer } from './infra/messaging/rabbitmq/payment.consumer';
import { RabbitMQConnection } from '@app/messaging';

@Module({
  providers: [
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
