import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);
  const port = process.env.PORT ?? 3003;
  await app.listen(port);
  console.log(`[PaymentService] Running on port ${port}`);
}

bootstrap();
