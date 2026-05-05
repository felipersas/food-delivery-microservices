/**
 * Standard success response envelope for all API endpoints
 * Provides consistent structure with data payload and optional metadata
 */
export interface SuccessResponse<T = any> {
  /** Response payload data */
  data: T;
  /** Response metadata (timestamp, request context) */
  meta?: ResponseMeta;
}

/**
 * Metadata included in successful responses
 */
export interface ResponseMeta {
  /** ISO 8601 timestamp of response generation */
  timestamp: string;
  /** Request path that generated this response */
  path: string;
  /** HTTP status code */
  statusCode: number;
}

/**
 * Pagination metadata for list responses
 */
export interface PaginationMeta {
  /** Current page number (1-based) */
  page: number;
  /** Items per page */
  limit: number;
  /** Total number of items across all pages */
  total: number;
  /** Total number of pages */
  totalPages: number;
  /** Whether there is a next page */
  hasNext: boolean;
}

/**
 * Paginated list response with metadata
 */
export interface PaginatedResponse<T = any> extends SuccessResponse<T[]> {
  /** Pagination information */
  pagination: PaginationMeta;
}
