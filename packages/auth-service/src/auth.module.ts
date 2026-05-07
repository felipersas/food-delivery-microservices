import { Module, type OnModuleInit } from '@nestjs/common';
import {
  APP_FILTER,
  APP_GUARD,
  APP_INTERCEPTOR,
  Reflector,
} from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './infra/http/auth.controller';
import { UserController } from './infra/http/user.controller';
import { HealthController } from './infra/http/health.controller';
import { RegisterUseCase } from './application/use-cases/register/register.use-case';
import { LoginUseCase } from './application/use-cases/login/login.use-case';
import { RefreshTokenUseCase } from './application/use-cases/refresh-token/refresh-token.use-case';
import { LogoutUseCase } from './application/use-cases/logout/logout.use-case';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user/get-current-user.use-case';
import { UpdateUserUseCase } from './application/use-cases/update-user/update-user.use-case';
import { ChangeStatusUseCase } from './application/use-cases/change-status/change-status.use-case';
import { ManageRolesUseCase } from './application/use-cases/manage-roles/manage-roles.use-case';
import { RevokeAllTokensUseCase } from './application/use-cases/revoke-tokens/revoke-all-tokens.use-case';
import { InMemoryUserRepository } from './infra/database/memory/user.repository';
import { PostgresUserRepository } from './infra/database/typeorm/repositories/user.repository.impl';
import { AuthEventPublisher } from './infra/messaging/rabbitmq/auth-event.publisher';
import { AuthConsumer } from './infra/messaging/rabbitmq/auth.consumer';
import { JwtStrategy } from './infra/http/guards/jwt.strategy';
import { RabbitMQConnection } from '@app/messaging';
import {
  AllExceptionsFilter,
  RolesGuard,
  SuccessResponseInterceptor,
} from '@app/shared';
import { UserEntity } from './infra/database/typeorm/entities/user.entity';
import { RefreshTokenEntity } from './infra/database/typeorm/entities/refresh-token.entity';
import configuration from './config/configuration';
import { validationSchema } from './config/validation';
import {
  RABBITMQ_CONNECTION,
  USER_REPOSITORY,
  EVENT_PUBLISHER,
  JWT_SERVICE,
} from './tokens';

const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 5, // 5 requests per minute
      },
    ]),
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (config: ConfigService) => ({
        secret: config.get<string>('jwt.secret'),
        signOptions: {
          expiresIn: config.get<string>('jwt.expiresIn'),
        },
      }),
      inject: [ConfigService],
    }),
    ...(usePostgres
      ? [
          TypeOrmModule.forRoot({
            type: 'postgres',
            url:
              process.env.AUTH_DATABASE_URL ??
              'postgres://postgres:postgres@localhost:5438/auth',
            entities: [UserEntity, RefreshTokenEntity],
            synchronize: process.env.NODE_ENV !== 'production',
          }),
        ]
      : []),
  ],
  controllers: [AuthController, UserController, HealthController],
  providers: [
    Reflector,
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
    {
      provide: APP_GUARD,
      useFactory: (reflector: Reflector) => new RolesGuard(reflector),
      inject: [Reflector],
    },
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: (config: ConfigService) =>
        new RabbitMQConnection({
          url: config.get<string>('rabbitmq.url')!,
          exchange: config.get<string>('rabbitmq.exchange')!,
        }),
      inject: [ConfigService],
    },
    {
      provide: USER_REPOSITORY,
      useClass: usePostgres ? PostgresUserRepository : InMemoryUserRepository,
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (conn: RabbitMQConnection) => new AuthEventPublisher(conn),
      inject: [RABBITMQ_CONNECTION],
    },
    {
      provide: JWT_SERVICE,
      useClass: JwtService,
    },
    JwtStrategy,
    RegisterUseCase,
    LoginUseCase,
    RefreshTokenUseCase,
    LogoutUseCase,
    GetCurrentUserUseCase,
    UpdateUserUseCase,
    ChangeStatusUseCase,
    ManageRolesUseCase,
    RevokeAllTokensUseCase,
    AuthConsumer,
  ],
})
export class AuthModule implements OnModuleInit {
  constructor(private readonly authConsumer: AuthConsumer) {}

  async onModuleInit() {
    await this.authConsumer.start();
  }
}
