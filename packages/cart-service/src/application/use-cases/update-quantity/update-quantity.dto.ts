/**
 * Update Quantity Use Case DTOs
 */

export interface UpdateQuantityInput {
  customerId: string;
  productId: string;
  quantity: number;
}

export interface UpdateQuantityOutput {
  cartId: string;
  productId: string;
  quantity: number;
}
