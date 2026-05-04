import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { OrderModule } from './order.module';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  const port = process.env.PORT ?? 3001;
  await app.listen(port);
  console.log(`[OrderService] Running on port ${port}`);
}

bootstrap();
