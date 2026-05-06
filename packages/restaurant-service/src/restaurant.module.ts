import { Module, type OnModuleInit } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantController } from './infra/http/restaurant.controller';
import { HealthController } from './infra/http/health.controller';
import { CreateRestaurantUseCase } from './application/use-cases/create-restaurant/create-restaurant.use-case';
import { GetRestaurantUseCase } from './application/use-cases/get-restaurant/get-restaurant.use-case';
import { ListRestaurantsUseCase } from './application/use-cases/list-restaurants/list-restaurants.use-case';
import { InMemoryRestaurantRepository } from './infra/database/memory/restaurant.repository';
import { PostgresRestaurantRepository } from './infra/database/typeorm/repositories/restaurant.repository.impl';
import { RabbitMQEventPublisher } from './infra/messaging/rabbitmq/restaurant-event.publisher';
import { RestaurantConsumer } from './infra/messaging/rabbitmq/restaurant.consumer';
import { RabbitMQConnection } from '@app/messaging';
import { AllExceptionsFilter, SuccessResponseInterceptor } from '@app/shared';
import { RestaurantEntity } from './infra/database/typeorm/entities/restaurant.entity';
import { OperatingHoursEntity } from './infra/database/typeorm/entities/operating-hours.entity';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import { RABBITMQ_CONNECTION, RESTAURANT_REPOSITORY, EVENT_PUBLISHER } from './tokens';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    ...(usePostgres ? [TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.RESTAURANT_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5437/restaurants',
      entities: [RestaurantEntity, OperatingHoursEntity],
      synchronize: process.env.NODE_ENV !== 'production',
    })] : []),
  ],
  controllers: [RestaurantController, HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: (configService: ConfigService) => new RabbitMQConnection({
        url: configService.get<string>('rabbitmq.url')!,
        exchange: configService.get<string>('rabbitmq.exchange')!,
      }),
      inject: [ConfigService],
    },
    {
      provide: RESTAURANT_REPOSITORY,
      useClass: usePostgres ? PostgresRestaurantRepository : InMemoryRestaurantRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
      inject: [RABBITMQ_CONNECTION],
    },
    CreateRestaurantUseCase,
    GetRestaurantUseCase,
    ListRestaurantsUseCase,
    RestaurantConsumer,
  ],
})
export class RestaurantModule implements OnModuleInit {
  constructor(private readonly restaurantConsumer: RestaurantConsumer) {}

  async onModuleInit() {
    await this.restaurantConsumer.start();
  }
}
