import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ApiGatewayModule } from './api-gateway.module';
import { scalarHtml } from '@app/shared';

async function bootstrap() {
  const app = await NestFactory.create(
    ApiGatewayModule,
    new ExpressAdapter(),
  );

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('API Gateway')
    .setDescription('API Gateway for food delivery microservices system')
    .setVersion('1.0')
    .addTag('orders', 'Order management endpoints (proxied to Order Service)')
    .addTag('payments', 'Payment processing endpoints (proxied to Payment Service)')
    .addTag('kitchen', 'Kitchen management endpoints (proxied to Kitchen Service)')
    .addTag('health', 'Health check endpoints')
    .addBearerAuth()
    .build();

  // @ts-expect-error - Version mismatch in workspace, works at runtime
  const document = SwaggerModule.createDocument(app, config);

  // Swagger UI
  // @ts-expect-error - Version mismatch in workspace, works at runtime
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'API Gateway',
  });

  // Scalar UI endpoint using middleware
  app.use('/api', (req: any, res: any, next: any) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(
        scalarHtml('/api/docs-json', 'API Gateway'),
      );
    } else {
      next();
    }
  });

  const port = process.env.API_GATEWAY_PORT ?? 3000;
  await app.listen(port);
  console.log(`API Gateway listening on port ${port}`);
  console.log(`API Gateway Swagger UI: http://localhost:${port}/api/docs`);
  console.log(`API Gateway Scalar UI: http://localhost:${port}/api`);
  console.log(`API Gateway OpenAPI JSON: http://localhost:${port}/api/docs-json`);
}

bootstrap();
