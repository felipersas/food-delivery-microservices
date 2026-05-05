import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { KitchenModule } from './kitchen.module';

async function bootstrap() {
  const app = await NestFactory.create(KitchenModule);
  await app.listen(3002);
  console.log(`[KitchenService] Running on port 3002`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[KitchenService] Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('[KitchenService] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
