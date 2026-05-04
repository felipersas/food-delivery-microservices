import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AnalyticsModule } from './analytics.module';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);
  const port = process.env.PORT ?? 3005;
  await app.listen(port);
  console.log(`[AnalyticsService] Running on port ${port}`);
}

bootstrap();
