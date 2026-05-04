import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  const port = process.env.PORT ?? 3004;
  await app.listen(port);
  console.log(`[NotificationService] Running on port ${port}`);
}

bootstrap();
