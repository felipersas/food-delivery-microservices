import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);
  await app.listen(3003);
  console.log(`[PaymentService] Running on port 3003`);
}

bootstrap();
