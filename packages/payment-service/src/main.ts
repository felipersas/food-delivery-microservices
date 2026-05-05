import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { PaymentModule } from './payment.module';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);
  await app.listen(3003);
  console.log(`[PaymentService] Running on port 3003`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[PaymentService] Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('[PaymentService] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
