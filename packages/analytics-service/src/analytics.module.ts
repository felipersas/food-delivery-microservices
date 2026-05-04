import { Module, type OnModuleInit } from '@nestjs/common';
import { AnalyticsConsumer } from './infra/messaging/rabbitmq/analytics.consumer';
import { RabbitMQConnection } from '@app/messaging';

@Module({
  providers: [
    {
      provide: 'RabbitMQConnection',
      useFactory: () =>
        new RabbitMQConnection({
          url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
          exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
        }),
    },
    AnalyticsConsumer,
  ],
})
export class AnalyticsModule implements OnModuleInit {
  constructor(private readonly consumer: AnalyticsConsumer) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
