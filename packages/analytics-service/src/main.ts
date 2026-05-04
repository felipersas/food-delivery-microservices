import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AnalyticsModule } from './analytics.module';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);
  await app.listen(3005);
  console.log(`[AnalyticsService] Running on port 3005`);
}

bootstrap();
