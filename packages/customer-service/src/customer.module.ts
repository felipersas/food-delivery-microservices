import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CustomerController } from './infra/http/customer.controller';
import { HealthController } from './infra/http/health.controller';
import { CreateCustomerUseCase } from './application/use-cases/create-customer/create-customer.use-case';
import { GetCustomerUseCase } from './application/use-cases/get-customer/get-customer.use-case';
import { UpdateCustomerProfileUseCase } from './application/use-cases/update-customer-profile/update-customer-profile.use-case';
import { AddCustomerAddressUseCase } from './application/use-cases/add-customer-address/add-customer-address.use-case';
import { RemoveCustomerAddressUseCase } from './application/use-cases/remove-customer-address/remove-customer-address.use-case';
import { SavePaymentMethodUseCase } from './application/use-cases/save-payment-method/save-payment-method.use-case';
import { RemovePaymentMethodUseCase } from './application/use-cases/remove-payment-method/remove-payment-method.use-case';
import { ListCustomersUseCase } from './application/use-cases/list-customers/list-customers.use-case';
import { InMemoryCustomerRepository } from './infra/database/memory/customer.repository';
import { PostgresCustomerRepository } from './infra/database/typeorm/repositories/customer.repository.impl';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/customer-event.publisher';
import { CustomerConsumer } from './infra/messaging/rabbitmq/customer.consumer';
import { RabbitMQConnection } from '@app/messaging';
import { AllExceptionsFilter, SuccessResponseInterceptor } from '@app/shared';
import { CustomerEntity } from './infra/database/typeorm/entities/customer.entity';
import configuration from './config/configuration';
import validationSchema from './config/validation';
import {
  RABBITMQ_CONNECTION,
  CUSTOMER_REPOSITORY,
  EVENT_PUBLISHER,
} from './tokens';

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
            url: process.env.CUSTOMER_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5436/customers',
            entities: [CustomerEntity],
            synchronize: process.env.NODE_ENV !== 'production',
          }),
        ]
      : []),
  ],
  controllers: [CustomerController, HealthController],
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
      provide: RABBITMQ_CONNECTION,
      useFactory: (configService: ConfigService) =>
        new RabbitMQConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: CUSTOMER_REPOSITORY,
      useClass: usePostgres ? PostgresCustomerRepository : InMemoryCustomerRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
      inject: [RABBITMQ_CONNECTION],
    },
    CreateCustomerUseCase,
    GetCustomerUseCase,
    UpdateCustomerProfileUseCase,
    AddCustomerAddressUseCase,
    RemoveCustomerAddressUseCase,
    SavePaymentMethodUseCase,
    RemovePaymentMethodUseCase,
    ListCustomersUseCase,
    CustomerConsumer,
  ],
})
export class CustomerModule implements OnModuleInit {
  constructor(private readonly customerConsumer: CustomerConsumer) {}

  async onModuleInit() {
    await this.customerConsumer.start();
  }
}
