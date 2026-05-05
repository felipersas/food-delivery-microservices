import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validationSchema } from './config/validation';
import configuration from './config/configuration';

import { HttpProxyStrategy } from './infra/strategies/http-proxy.strategy';
import { HealthController } from './infra/http/controllers/health.controller';
import { OrdersController } from './infra/http/controllers/orders.controller';
import { KitchenController } from './infra/http/controllers/kitchen.controller';
import { PaymentsController } from './infra/http/controllers/payments.controller';

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL ?? 'http://localhost:3001';
const KITCHEN_SERVICE_URL = process.env.KITCHEN_SERVICE_URL ?? 'http://localhost:3002';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema,
      load: [configuration],
    }),
  ],
  controllers: [HealthController, OrdersController, KitchenController, PaymentsController],
  providers: [
    HttpProxyStrategy,
    { provide: 'ORDER_SERVICE_URL', useValue: ORDER_SERVICE_URL },
    { provide: 'KITCHEN_SERVICE_URL', useValue: KITCHEN_SERVICE_URL },
    { provide: 'PAYMENT_SERVICE_URL', useValue: process.env.PAYMENT_SERVICE_URL ?? 'http://localhost:3003' },
    { provide: 'NOTIFICATION_SERVICE_URL', useValue: process.env.NOTIFICATION_SERVICE_URL ?? 'http://localhost:3004' },
    { provide: 'ANALYTICS_SERVICE_URL', useValue: process.env.ANALYTICS_SERVICE_URL ?? 'http://localhost:3005' },
  ],
  exports: [HttpProxyStrategy],
})
export class ApiGatewayModule {}
