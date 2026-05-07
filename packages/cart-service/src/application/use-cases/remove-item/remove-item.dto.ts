/**
 * Remove Item Use Case DTOs
 */

export interface RemoveItemInput {
  customerId: string;
  productId: string;
}

export interface RemoveItemOutput {
  cartId: string;
  productId: string;
}
