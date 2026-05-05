import { DocumentBuilder, type OpenAPIObject } from '@nestjs/swagger';

export interface ServiceOpenAPIConfig {
  title: string;
  description: string;
  version: string;
  tag?: string;
}

/**
 * Creates a standardized OpenAPI configuration for microservices
 */
export function createOpenAPIConfig(config: ServiceOpenAPIConfig): Omit<OpenAPIObject, 'paths'> {
  const builder = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version)
    .addServer('http://localhost:3000', 'API Gateway')
    .addServer('http://localhost:3001', 'Order Service')
    .addServer('http://localhost:3002', 'Kitchen Service')
    .addServer('http://localhost:3003', 'Payment Service')
    .addTag('health', 'Health check endpoints');

  if (config.tag) {
    builder.addTag(config.tag);
  }

  return builder.build();
}

/**
 * Common API response decorators for consistent error responses
 */
export const commonResponses = {
  notFound: { description: 'Resource not found' },
  badRequest: { description: 'Invalid request data' },
  unauthorized: { description: 'Unauthorized access' },
  internalError: { description: 'Internal server error' },
} as const;
