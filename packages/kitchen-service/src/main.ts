import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { KitchenModule } from './kitchen.module';
import { scalarHtml } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(KitchenModule);
  app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3002;

  // OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Kitchen Service API')
    .setDescription('Kitchen order preparation microservice for food delivery system')
    .setVersion('1.0')
    .addTag('kitchen', 'Kitchen ticket management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  // @ts-expect-error - Version mismatch in workspace, works at runtime
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI
  // @ts-expect-error - Version mismatch in workspace, works at runtime
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Kitchen Service API',
  });

  // Scalar UI endpoint using middleware
  app.use('/api', (req: any, res: any, next: any) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(
        scalarHtml('/api/docs-json', 'Kitchen Service API'),
      );
    } else {
      next();
    }
  });

  await app.listen(port);
  console.log(`[KitchenService] Running on port ${port}`);
  console.log(`[KitchenService] Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`[KitchenService] Scalar UI: http://localhost:${port}/api`);
  console.log(`[KitchenService] OpenAPI JSON: http://localhost:${port}/api/docs-json`);

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
