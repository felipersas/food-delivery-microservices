import { Module, type OnModuleInit } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KitchenProcessor } from './application/processors/kitchen.processor';
import { KitchenWorkerService } from './application/workers/kitchen.worker';
import { KitchenConsumer } from './infra/messaging/rabbitmq/kitchen.consumer';
import { KitchenQueue } from './infra/queue/kitchen.queue';
import { InMemoryKitchenTicketRepository } from './infra/database/memory/kitchen-ticket.repository';
import { PostgresKitchenTicketRepository } from './infra/database/typeorm/repositories/kitchen-ticket.repository.impl';
import { KitchenTicketEntity } from './infra/database/typeorm/entities/kitchen-ticket.entity';
import { KitchenTicketItemEntity } from './infra/database/typeorm/entities/kitchen-ticket-item.entity';
import { RabbitMQConnection } from '@app/messaging';
import type { KitchenTicketRepository } from './domain/repositories/kitchen-ticket.repository.interface';

const REDIS_OPTS = { host: 'localhost', port: 6379 };
const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: usePostgres
    ? [
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5434/kitchen',
          entities: [KitchenTicketEntity, KitchenTicketItemEntity],
          synchronize: process.env.NODE_ENV !== 'production',
        }),
      ]
    : [],
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
      provide: 'KitchenTicketRepository',
      useClass: usePostgres ? PostgresKitchenTicketRepository : InMemoryKitchenTicketRepository,
    },
    {
      provide: 'KitchenWorkerService',
      useFactory: (rabbit: RabbitMQConnection, repo: KitchenTicketRepository) =>
        new KitchenWorkerService(REDIS_OPTS, 'kitchen-jobs', rabbit, repo),
      inject: ['RabbitMQConnection', 'KitchenTicketRepository'],
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
