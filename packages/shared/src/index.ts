// Domain base
export { Entity } from './domain/entity';
export { ValueObject } from './domain/value-object';
export { AggregateRoot } from './domain/aggregate-root';
export type { DomainEvent } from './domain/domain-event';
export type { Repository } from './domain/repository.interface';
export { UserContext, type UserContextProps } from './domain/user-context.vo';

// Types
export { Money } from './types/money';
export { UserRoleEnum, isUserRole, getAllRoles } from './types/user-roles';

// Events
export type { OrderCreatedEvent, OrderCreatedData } from './events/order-created.event';
export type { OrderConfirmedEvent, OrderConfirmedData } from './events/order-confirmed.event';
export type { PaymentConfirmedEvent, PaymentConfirmedData } from './events/payment-confirmed.event';
export type { PaymentRejectedEvent, PaymentRejectedData } from './events/payment-rejected.event';
export type { OrderReadyEvent, OrderReadyData } from './events/order-ready.event';
export type {
  PaymentRefundInitiatedEvent,
  PaymentRefundCompletedEvent,
  PaymentRefundFailedEvent,
  PaymentRefundInitiatedData,
  PaymentRefundCompletedData,
  PaymentRefundFailedData,
} from './events/payment-refund-events';

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

// HTTP - Auth components
export { CurrentUser } from './infra/http/current-user.decorator';
export { Roles, ROLES_KEY } from './infra/http/decorators/roles.decorator';
export { ResourceOwner, UseResourceOwner } from './infra/http/decorators/resource-owner.decorator';
export { RolesGuard } from './infra/http/guards/roles.guard';
export { ResourceOwnerGuard, RESOURCE_OWNER_GUARD_OPTIONS, type ResourceOwnerGuardOptions } from './infra/http/guards/resource-owner.guard';
export { UserContextMiddleware } from './infra/http/middleware/user-context.middleware';
