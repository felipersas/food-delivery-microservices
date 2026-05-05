import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AnalyticsModule } from './analytics.module';

async function bootstrap() {
  const app = await NestFactory.create(AnalyticsModule);
  await app.listen(3005);
  console.log(`[AnalyticsService] Running on port 3005`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[AnalyticsService] Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('[AnalyticsService] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
