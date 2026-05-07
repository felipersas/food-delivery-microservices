import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import path from 'path';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { validationSchema } from './config/validation';
import configuration from './config/configuration';

import { HttpProxyStrategy } from './infra/strategies/http-proxy.strategy';
import { HealthController } from './infra/http/controllers/health.controller';
import { OrdersController } from './infra/http/controllers/orders.controller';
import { KitchenController } from './infra/http/controllers/kitchen.controller';
import { PaymentsController } from './infra/http/controllers/payments.controller';
import { CustomersController } from './infra/http/controllers/customers.controller';
import { AuthController } from './infra/http/controllers/auth.controller';
import { CartsController } from './infra/http/controllers/carts.controller';

import { JwtValidator } from './infra/auth/jwt.validator';
import { AuthProxyStrategy } from './infra/auth/auth-proxy.strategy';
import { AuthInterceptor } from './infra/auth/auth.interceptor';
import {
  ORDER_SERVICE_URL,
  KITCHEN_SERVICE_URL,
  PAYMENT_SERVICE_URL,
  NOTIFICATION_SERVICE_URL,
  ANALYTICS_SERVICE_URL,
  CUSTOMER_SERVICE_URL,
  RESTAURANT_SERVICE_URL,
  AUTH_SERVICE_URL,
  CART_SERVICE_URL,
} from './tokens';

const ORDER_SERVICE_URL_VALUE =
  process.env.ORDER_SERVICE_URL ?? 'http://localhost:3001';
const KITCHEN_SERVICE_URL_VALUE =
  process.env.KITCHEN_SERVICE_URL ?? 'http://localhost:3002';
const PAYMENT_SERVICE_URL_VALUE =
  process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003';
const NOTIFICATION_SERVICE_URL_VALUE =
  process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004';
const ANALYTICS_SERVICE_URL_VALUE =
  process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005';
const CUSTOMER_SERVICE_URL_VALUE =
  process.env.CUSTOMER_SERVICE_URL ?? 'http://localhost:3006';
const AUTH_SERVICE_URL_VALUE =
  process.env.AUTH_SERVICE_URL ?? 'http://localhost:3008';
const RESTAURANT_SERVICE_URL_VALUE =
  process.env.RESTAURANT_SERVICE_URL ?? 'http://localhost:3007';
const CART_SERVICE_URL_VALUE =
  process.env.CART_SERVICE_URL ?? 'http://localhost:3009';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [configuration],
      envFilePath: [
        '.env',
        '../../.env',
        '../.env',
        path.join(process.cwd(), '../../.env'),
      ],
    }),
  ],
  controllers: [
    HealthController,
    OrdersController,
    KitchenController,
    PaymentsController,
    CustomersController,
    AuthController,
    CartsController,
  ],
  providers: [
    HttpProxyStrategy,
    JwtValidator,
    AuthProxyStrategy,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuthInterceptor,
    },
    { provide: ORDER_SERVICE_URL, useValue: ORDER_SERVICE_URL_VALUE },
    { provide: KITCHEN_SERVICE_URL, useValue: KITCHEN_SERVICE_URL_VALUE },
    { provide: PAYMENT_SERVICE_URL, useValue: PAYMENT_SERVICE_URL_VALUE },
    {
      provide: NOTIFICATION_SERVICE_URL,
      useValue: NOTIFICATION_SERVICE_URL_VALUE,
    },
    { provide: ANALYTICS_SERVICE_URL, useValue: ANALYTICS_SERVICE_URL_VALUE },
    { provide: CUSTOMER_SERVICE_URL, useValue: CUSTOMER_SERVICE_URL_VALUE },
    { provide: RESTAURANT_SERVICE_URL, useValue: RESTAURANT_SERVICE_URL_VALUE },
    { provide: AUTH_SERVICE_URL, useValue: AUTH_SERVICE_URL_VALUE },
    { provide: CART_SERVICE_URL, useValue: CART_SERVICE_URL_VALUE },
  ],
  exports: [HttpProxyStrategy, AuthProxyStrategy],
})
export class ApiGatewayModule {}
