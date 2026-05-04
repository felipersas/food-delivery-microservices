import { Module, type OnModuleInit } from '@nestjs/common';
import { NotificationConsumer } from './infra/messaging/rabbitmq/notification.consumer';
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
    NotificationConsumer,
  ],
})
export class NotificationModule implements OnModuleInit {
  constructor(private readonly consumer: NotificationConsumer) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
