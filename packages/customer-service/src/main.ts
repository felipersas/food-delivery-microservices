import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { CustomerModule } from './customer.module';
import { scalarHtml } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(CustomerModule);
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((err) => ({
          field: err.property,
          constraints: Object.values(err.constraints || {}),
        }));
        return new BadRequestException({
          message: 'Validation failed',
          errors: messages,
        });
      },
    }),
  );

  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3006;

  // OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Customer Service API')
    .setDescription('Customer management microservice for food delivery system')
    .setVersion('1.0')
    .addTag('customers', 'Customer management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Customer Service API',
  });

  // Scalar UI endpoint using middleware
  app.use('/api', (req: any, res: any, next: any) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(
        scalarHtml('/api/docs-json', 'Customer Service API'),
      );
    } else {
      next();
    }
  });

  await app.listen(port);
  console.log(`[CustomerService] Running on port ${port}`);
  console.log(`[CustomerService] Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`[CustomerService] Scalar UI: http://localhost:${port}/api`);
  console.log(`[CustomerService] OpenAPI JSON: http://localhost:${port}/api/docs-json`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[CustomerService] Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('[CustomerService] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
