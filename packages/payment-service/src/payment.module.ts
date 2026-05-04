import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProcessPaymentUseCase } from './application/use-cases/process-payment/process-payment.use-case';
import { PaymentConsumer } from './infra/messaging/rabbitmq/payment.consumer';
import { InMemoryPaymentRepository } from './infra/database/memory/payment.repository';
import { PostgresPaymentRepository } from './infra/database/typeorm/repositories/payment.repository.impl';
import { PaymentEntity } from './infra/database/typeorm/entities/payment.entity';
import { RabbitMQConnection } from '@app/messaging';
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
            url: process.env.PAYMENT_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/payments',
            entities: [PaymentEntity],
            synchronize: process.env.NODE_ENV !== 'production',
          }),
        ]
      : []),
  ],
  providers: [
    {
      provide: 'PaymentRepository',
      useClass: usePostgres ? PostgresPaymentRepository : InMemoryPaymentRepository,
    },
    ProcessPaymentUseCase,
    {
      provide: 'RabbitMQConnection',
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
