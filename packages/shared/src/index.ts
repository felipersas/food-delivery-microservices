// Domain base
export { Entity } from './domain/entity';
export { ValueObject } from './domain/value-object';
export { AggregateRoot } from './domain/aggregate-root';
export type { DomainEvent } from './domain/domain-event';
export type { Repository } from './domain/repository.interface';

// Types
export { Money } from './types/money';

// Events
export type { OrderCreatedEvent, OrderCreatedData } from './events/order-created.event';
export type { OrderConfirmedEvent, OrderConfirmedData } from './events/order-confirmed.event';
export type { PaymentConfirmedEvent, PaymentConfirmedData } from './events/payment-confirmed.event';
export type { PaymentRejectedEvent, PaymentRejectedData } from './events/payment-rejected.event';
export type { OrderReadyEvent, OrderReadyData } from './events/order-ready.event';

// OpenAPI
export { createOpenAPIConfig, commonResponses } from './openapi/openapi.config';
export { scalarHtml } from './openapi/scalar.config';

// Exceptions
export {
  DomainException,
  InvalidStateException,
  ValidationException,
  ResourceNotFoundException,
} from './exceptions/domain.exception';

// Filters
export { AllExceptionsFilter } from './filters/all-exceptions.filter';

// Interceptors
export { SuccessResponseInterceptor } from './interceptors/success-response.interceptor';

// Interfaces
export type { SuccessResponse, ResponseMeta, PaginationMeta, PaginatedResponse } from './interfaces/response.interface';
