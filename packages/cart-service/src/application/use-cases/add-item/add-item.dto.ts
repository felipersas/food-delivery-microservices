/**
 * Add Item Use Case DTOs
 */

export interface AddItemInput {
  customerId: string;
  productId: string;
  restaurantId: string;
  quantity: number;
}

export interface AddItemOutput {
  cartId: string;
  productId: string;
  quantity: number;
  priceCents: number;
}
