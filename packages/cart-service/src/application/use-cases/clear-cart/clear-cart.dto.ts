/**
 * Clear Cart Use Case DTOs
 */

export interface ClearCartInput {
  customerId: string;
}

export interface ClearCartOutput {
  cartId: string;
  cleared: boolean;
}
