import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { RestaurantModule } from './restaurant.module';
import { scalarHtml } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(RestaurantModule);

  // User context middleware - extracts user from gateway headers
  app.use((req: any, _res: any, next: any) => {
    const userId = req.headers['x-user-id'] as string | undefined;
    const userEmail = req.headers['x-user-email'] as string | undefined;
    const userRole = req.headers['x-user-role'] as string | undefined;
    if (userId) {
      req.user = { id: userId, email: userEmail, role: userRole };
    }
    next();
  });

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
  const port = configService.get<number>('port') ?? 3007;

  // OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Restaurant Service API')
    .setDescription('Restaurant management microservice for food delivery system')
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
    .addTag('restaurants', 'Restaurant management endpoints')
    .addTag('health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Restaurant Service API',
  });

  // Scalar UI endpoint using middleware
  app.use('/api', (req: any, res: any, next: any) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(
        scalarHtml('/api/docs-json', 'Restaurant Service API'),
      );
    } else {
      next();
    }
  });

  await app.listen(port);
  console.log(`[RestaurantService] Running on port ${port}`);
  console.log(`[RestaurantService] Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`[RestaurantService] Scalar UI: http://localhost:${port}/api`);
  console.log(`[RestaurantService] OpenAPI JSON: http://localhost:${port}/api/docs-json`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`[RestaurantService] Received ${signal}, shutting down gracefully...`);
    await app.close();
    console.log('[RestaurantService] Shutdown complete');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
