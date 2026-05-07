/**
 * Get Cart Use Case DTOs
 */

export interface GetCartInput {
  customerId: string;
}

export interface CartItemOutput {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  priceChanged?: boolean;
  originalPriceCents?: number;
}

export interface GetCartOutput {
  cartId: string;
  customerId: string;
  restaurantId: string | null;
  items: CartItemOutput[];
  totalAmountCents: number;
  status: string;
}
