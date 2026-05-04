import { Module, type OnModuleInit } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AnalyticsConsumer } from './infra/messaging/rabbitmq/analytics.consumer';
import { RabbitMQConnection } from '@app/messaging';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
  ],
  providers: [
    {
      provide: 'RabbitMQConnection',
      useFactory: (configService: ConfigService) =>
        new RabbitMQConnection({
          url: configService.get<string>('rabbitmq.url')!,
          exchange: configService.get<string>('rabbitmq.exchange')!,
        }),
      inject: [ConfigService],
    },
    AnalyticsConsumer,
  ],
})
export class AnalyticsModule implements OnModuleInit {
  constructor(private readonly consumer: AnalyticsConsumer) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
