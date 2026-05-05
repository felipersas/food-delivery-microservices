import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { NotificationModule } from './notification.module';

async function bootstrap() {
  const app = await NestFactory.create(NotificationModule);
  await app.listen(3004);
  console.log(`[NotificationService] Running on port 3004`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[NotificationService] Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('[NotificationService] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
