import { Module, type OnModuleInit } from '@nestjs/common';
import { KitchenProcessor } from './application/processors/kitchen.processor';
import { KitchenConsumer } from './infra/messaging/rabbitmq/kitchen.consumer';
import { RabbitMQConnection } from '@app/messaging';

@Module({
  providers: [
    KitchenProcessor,
    {
      provide: 'RabbitMQConnection',
      useFactory: () =>
        new RabbitMQConnection({
          url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
          exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
        }),
    },
    KitchenConsumer,
  ],
})
export class KitchenModule implements OnModuleInit {
  constructor(private readonly consumer: KitchenConsumer) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
