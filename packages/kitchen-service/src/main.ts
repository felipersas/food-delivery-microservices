import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { KitchenModule } from './kitchen.module';

async function bootstrap() {
  const app = await NestFactory.create(KitchenModule);
  const port = process.env.PORT ?? 3002;
  await app.listen(port);
  console.log(`[KitchenService] Running on port ${port}`);
}

bootstrap();
