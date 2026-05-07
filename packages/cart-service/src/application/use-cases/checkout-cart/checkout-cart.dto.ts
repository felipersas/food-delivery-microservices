/**
 * Checkout Cart Use Case DTOs
 */

export enum PaymentMethodType {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PIX = 'PIX',
  CASH = 'CASH',
}

export interface CheckoutCartInput {
  customerId: string;
  paymentMethodIndex?: number;
  paymentMethodType?: PaymentMethodType;
}

export interface CheckoutOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  priceCents: number;
}

export interface CheckoutCartOutput {
  cartId: string;
  orderId: string;
  restaurantId: string;
  items: CheckoutOrderItem[];
  totalAmountCents: number;
  paymentMethodIndex?: number;
  paymentMethodType?: string;
}
