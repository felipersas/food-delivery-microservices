import { Module, type OnModuleInit } from '@nestjs/common';
import { KitchenProcessor } from './application/processors/kitchen.processor';
import { KitchenWorkerService } from './application/workers/kitchen.worker';
import { KitchenConsumer } from './infra/messaging/rabbitmq/kitchen.consumer';
import { KitchenQueue } from './infra/queue/kitchen.queue';
import { RabbitMQConnection } from '@app/messaging';

const REDIS_OPTS = { host: 'localhost', port: 6379 };

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
    {
      provide: 'KitchenQueue',
      useFactory: () => new KitchenQueue(REDIS_OPTS),
    },
    {
      provide: 'KitchenWorkerService',
      useFactory: (rabbit: RabbitMQConnection) =>
        new KitchenWorkerService(REDIS_OPTS, 'kitchen-jobs', rabbit),
      inject: ['RabbitMQConnection'],
    },
    KitchenConsumer,
  ],
})
export class KitchenModule implements OnModuleInit {
  constructor(
    private readonly consumer: KitchenConsumer,
    private readonly _workerService: KitchenWorkerService,
  ) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
