/**
 * Dependency injection tokens for Kitchen module
 *
 * Using string constants as recommended by NestJS docs:
 * https://docs.nestjs.com/fundamentals/custom-providers#non-class-based-provider-tokens
 */
export const RABBITMQ_CONNECTION = 'RabbitMQConnection';
export const KITCHEN_QUEUE = 'KitchenQueue';
export const KITCHEN_TICKET_REPOSITORY = 'KitchenTicketRepository';
export const KITCHEN_WORKER_SERVICE = 'KitchenWorkerService';
export const EVENT_PUBLISHER = 'EventPublisher';
