import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { scalarHtml } from '@app/shared';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule, {
    logger: ['error', 'warn', 'log'],
  });

  const config = app.get(ConfigService);

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

  // CORS
  app.enableCors({
    origin: true,
    credentials: true,
  });

  // OpenAPI
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Auth Service API')
    .setDescription('Authentication and authorization service')
    .setVersion('1.0')
    .addTag('auth')
    .addTag('users')
    .addTag('health')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  // Scalar UI
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(scalarHtml('/api/docs-json', 'Auth Service API'));
    } else {
      next();
    }
  });

  const port = config.get<number>('port') ?? 3008;
  await app.listen(port);

  console.log(`Auth Service running on http://localhost:${port}`);
  console.log(`API Docs: http://localhost:${port}/api/docs`);
  console.log(`Scalar UI: http://localhost:${port}/api`);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    console.log(`Received ${signal}, shutting down...`);
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
