import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HealthController } from './infra/http/health.controller';
import { PaymentController } from './infra/http/payment.controller';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment/process-payment.use-case';
import { RefundPaymentUseCase } from './application/use-cases/refund-payment/refund-payment.use-case';
import { PaymentConsumer } from './infra/messaging/rabbitmq/payment.consumer';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/payment-event.publisher';
import { InMemoryPaymentRepository } from './infra/database/memory/payment.repository';
import { PostgresPaymentRepository } from './infra/database/typeorm/repositories/payment.repository.impl';
import { PaymentEntity } from './infra/database/typeorm/entities/payment.entity';
import { RabbitMQConnection } from '@app/messaging';
import { AllExceptionsFilter, SuccessResponseInterceptor } from '@app/shared';
import type { EventPublisher } from './infra/messaging/rabbitmq/payment-event.publisher';
import type { PaymentRepository } from './domain/repositories/payment.repository.interface';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import {
  RABBITMQ_CONNECTION,
  PAYMENT_REPOSITORY,
  EVENT_PUBLISHER,
} from './tokens';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  controllers: [HealthController, PaymentController],
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
            url: process.env.PAYMENT_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/payments',
            entities: [PaymentEntity],
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
      provide: PAYMENT_REPOSITORY,
      useClass: usePostgres ? PostgresPaymentRepository : InMemoryPaymentRepository,
    },
    {
      provide: ProcessPaymentUseCase,
      useFactory: (repo: PaymentRepository) => new ProcessPaymentUseCase(repo),
      inject: [PAYMENT_REPOSITORY],
    },
    {
      provide: RefundPaymentUseCase,
      useFactory: (repo: PaymentRepository, publisher: EventPublisher) =>
        new RefundPaymentUseCase(repo, publisher),
      inject: [PAYMENT_REPOSITORY, EVENT_PUBLISHER],
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (connection: RabbitMQConnection) => new RabbitMQEventPublisher(connection),
      inject: [RABBITMQ_CONNECTION],
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
    PaymentConsumer,
  ],
})
export class PaymentModule implements OnModuleInit {
  constructor(private readonly consumer: PaymentConsumer) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
