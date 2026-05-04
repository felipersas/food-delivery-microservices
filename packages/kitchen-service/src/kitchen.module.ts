import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
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
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    ...(usePostgres
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.KITCHEN_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5434/kitchen',
            entities: [KitchenTicketEntity, KitchenTicketItemEntity],
            synchronize: process.env.NODE_ENV !== 'production',
          }),
        ]
      : []),
  ],
  providers: [
    KitchenProcessor,
    {
      provide: 'RabbitMQConnection',
      useFactory: (configService: ConfigService) =>
        new RabbitMQConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: 'KitchenQueue',
      useFactory: (configService: ConfigService) =>
        new KitchenQueue({
          host: configService.get<string>('redis.host')!,
          port: configService.get<number>('redis.port')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: 'KitchenTicketRepository',
      useClass: usePostgres ? PostgresKitchenTicketRepository : InMemoryKitchenTicketRepository,
    },
    {
      provide: 'KitchenWorkerService',
      useFactory: (
        rabbit: RabbitMQConnection,
        repo: KitchenTicketRepository,
        configService: ConfigService,
      ) =>
        new KitchenWorkerService(
          { host: configService.get<string>('redis.host')!, port: configService.get<number>('redis.port')! },
          'kitchen-jobs',
          rabbit,
          repo,
        ),
      inject: ['RabbitMQConnection', 'KitchenTicketRepository', ConfigService],
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
