import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Base exception for domain-related errors.
 * Extends HttpException to ensure proper HTTP status codes.
 *
 * @example
 * throw new DomainException('Order total must be greater than zero');
 *
 * @example
 * throw new DomainException('Payment already confirmed', HttpStatus.CONFLICT);
 */
export class DomainException extends HttpException {
  constructor(message: string, status: HttpStatus = HttpStatus.BAD_REQUEST) {
    super(
      {
        statusCode: status,
        message,
        error: HttpStatus[status] || 'Domain Error',
      },
      status,
    );
  }
}

/**
 * Exception for invalid state transitions in aggregates.
 * Used when an operation cannot be performed due to current state.
 */
export class InvalidStateException extends DomainException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Exception for validation errors in domain logic.
 * Used when business rules are violated.
 */
export class ValidationException extends DomainException {
  constructor(message: string) {
    super(message, HttpStatus.BAD_REQUEST);
  }
}

/**
 * Exception for resource not found scenarios.
 * Used when a requested aggregate/entity does not exist.
 */
export class ResourceNotFoundException extends DomainException {
  constructor(resource: string, identifier?: string) {
    const message = identifier
      ? `${resource} with identifier '${identifier}' not found`
      : `${resource} not found`;
    super(message, HttpStatus.NOT_FOUND);
  }
}
