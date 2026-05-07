import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { PaymentModule } from './payment.module';
import { scalarHtml, userContextMiddleware } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(PaymentModule);

  // User context middleware - extracts user from gateway headers
  app.use(userContextMiddleware);

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
  const port = configService.get<number>('port') ?? 3003;

  // OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Payment Service API')
    .setDescription('Payment processing microservice for food delivery system')
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token obtained from Auth Service',
      },
      'JWT',
    )
    .addTag('payments', 'Payment processing endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  // @ts-expect-error - Version mismatch in workspace, works at runtime
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI
  // @ts-expect-error - Version mismatch in workspace, works at runtime
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Payment Service API',
  });

  // Scalar UI endpoint using middleware
  app.use('/api', (req: any, res: any, next: any) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(
        scalarHtml('/api/docs-json', 'Payment Service API'),
      );
    } else {
      next();
    }
  });

  await app.listen(port);
  console.log(`[PaymentService] Running on port ${port}`);
  console.log(`[PaymentService] Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`[PaymentService] Scalar UI: http://localhost:${port}/api`);
  console.log(`[PaymentService] OpenAPI JSON: http://localhost:${port}/api/docs-json`);

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
