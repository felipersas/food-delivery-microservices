import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { KitchenModule } from './kitchen.module';

async function bootstrap() {
  const app = await NestFactory.create(KitchenModule);
  await app.listen(3002);
  console.log(`[KitchenService] Running on port 3002`);
}

bootstrap();
