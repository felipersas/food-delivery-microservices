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

export interface CheckoutCartOutput {
  cartId: string;
  restaurantId: string;
  totalAmountCents: number;
  message: string;
}
