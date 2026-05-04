import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  await app.listen(3004);
  console.log(`[NotificationService] Running on port 3004`);
}

bootstrap();
