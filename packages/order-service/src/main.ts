import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { OrderModule } from './order.module';
import { scalarHtml } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(OrderModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3001;

  // OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Order Service API')
    .setDescription('Order management microservice for food delivery system')
    .setVersion('1.0')
    .addTag('orders', 'Order management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  // @ts-expect-error - Version mismatch in workspace, works at runtime
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI
  // @ts-expect-error - Version mismatch in workspace, works at runtime
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Order Service API',
  });

  // Scalar UI endpoint using middleware
  app.use('/api', (req: any, res: any, next: any) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(
        scalarHtml('/api/docs-json', 'Order Service API'),
      );
    } else {
      next();
    }
  });

  await app.listen(port);
  console.log(`[OrderService] Running on port ${port}`);
  console.log(`[OrderService] Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`[OrderService] Scalar UI: http://localhost:${port}/api`);
  console.log(`[OrderService] OpenAPI JSON: http://localhost:${port}/api/docs-json`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[OrderService] Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('[OrderService] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
