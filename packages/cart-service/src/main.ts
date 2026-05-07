import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import type { Request, Response, NextFunction } from 'express';
import { CartModule } from './cart.module';
import { scalarHtml, userContextMiddleware } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(CartModule);

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
  const port = configService.get<number>('port') ?? 3009;

  const config = new DocumentBuilder()
    .setTitle('Cart Service API')
    .setDescription('Shopping cart management microservice')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'JWT',
    )
    .addTag('carts')
    .addTag('health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'Cart Service API',
  });

  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'GET' && req.url === '/') {
      res
        .set('Content-Type', 'text/html')
        .send(scalarHtml('/api/docs-json', 'Cart Service API'));
    } else {
      next();
    }
  });

  await app.listen(port);
  console.log(`[CartService] Running on port ${port}`);

  const shutdown = async (signal: string) => {
    console.log(`[CartService] Received ${signal}, shutting down...`);
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
