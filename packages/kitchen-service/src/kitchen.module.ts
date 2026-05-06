import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR, APP_GUARD } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './infra/http/health.controller';
import { KitchenController } from './infra/http/kitchen.controller';
import { CreateKitchenTicketUseCase } from './application/use-cases/create-kitchen-ticket';
import { GetKitchenTicketUseCase } from './application/use-cases/get-kitchen-ticket';
import { UpdateKitchenTicketStatusUseCase } from './application/use-cases/update-kitchen-ticket-status';
import { ProcessKitchenTicketUseCase } from './application/use-cases/process-kitchen-ticket/process-kitchen-ticket.use-case';
import { ListKitchenTicketsUseCase } from './application/use-cases/list-kitchen-tickets/list-kitchen-tickets.use-case';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/kitchen-event.publisher';
import { KitchenWorkerService } from './application/workers/kitchen.worker';
import { KitchenConsumer } from './infra/messaging/rabbitmq/kitchen.consumer';
import { KitchenQueue } from './infra/queue/kitchen.queue';
import { InMemoryKitchenTicketRepository } from './infra/database/memory/kitchen-ticket.repository';
import { PostgresKitchenTicketRepository } from './infra/database/typeorm/repositories/kitchen-ticket.repository.impl';
import { KitchenTicketEntity } from './infra/database/typeorm/entities/kitchen-ticket.entity';
import { KitchenTicketItemEntity } from './infra/database/typeorm/entities/kitchen-ticket-item.entity';
import { RabbitMQConnection } from '@app/messaging';
import { AllExceptionsFilter, SuccessResponseInterceptor, RolesGuard } from '@app/shared';
import type { KitchenTicketRepository } from './domain/repositories/kitchen-ticket.repository.interface';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import {
  RABBITMQ_CONNECTION,
  KITCHEN_QUEUE,
  KITCHEN_TICKET_REPOSITORY,
  KITCHEN_WORKER_SERVICE,
  EVENT_PUBLISHER,
} from './tokens';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  controllers: [HealthController, KitchenController],
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
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SuccessResponseInterceptor,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: (configService: ConfigService) =>
        new RabbitMQConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: KITCHEN_QUEUE,
      useFactory: (configService: ConfigService) =>
        new KitchenQueue({
          host: configService.get<string>('redis.host')!,
          port: configService.get<number>('redis.port')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: KITCHEN_TICKET_REPOSITORY,
      useClass: usePostgres ? PostgresKitchenTicketRepository : InMemoryKitchenTicketRepository,
    },
    {
      provide: KITCHEN_WORKER_SERVICE,
      useFactory: (
        useCase: ProcessKitchenTicketUseCase,
        configService: ConfigService,
      ) =>
        new KitchenWorkerService(
          { host: configService.get<string>('redis.host')!, port: configService.get<number>('redis.port')! },
          'kitchen-jobs',
          useCase,
        ),
      inject: [ProcessKitchenTicketUseCase, ConfigService],
    },
    {
      provide: ProcessKitchenTicketUseCase,
      useFactory: (repo: KitchenTicketRepository, publisher: any) =>
        new ProcessKitchenTicketUseCase(repo, publisher),
      inject: [KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER],
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (rabbit: RabbitMQConnection) => new RabbitMQEventPublisher(rabbit),
      inject: [RABBITMQ_CONNECTION],
    },
    {
      provide: CreateKitchenTicketUseCase,
      useFactory: (repo: KitchenTicketRepository, publisher: any) =>
        new CreateKitchenTicketUseCase(repo, publisher),
      inject: [KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER],
    },
    {
      provide: GetKitchenTicketUseCase,
      useFactory: (repo: KitchenTicketRepository) => new GetKitchenTicketUseCase(repo),
      inject: [KITCHEN_TICKET_REPOSITORY],
    },
    {
      provide: UpdateKitchenTicketStatusUseCase,
      useFactory: (repo: KitchenTicketRepository, publisher: any) =>
        new UpdateKitchenTicketStatusUseCase(repo, publisher),
      inject: [KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER],
    },
    {
      provide: 'ListKitchenTicketsUseCase',
      useFactory: (repo: KitchenTicketRepository) => new ListKitchenTicketsUseCase(repo),
      inject: [KITCHEN_TICKET_REPOSITORY],
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
