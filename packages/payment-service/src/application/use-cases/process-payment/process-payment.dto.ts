export interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  method: string;
  customerId?: string;
  paymentMethodIndex?: number;
  paymentMethodToken?: string;
  paymentMethodBrand?: string;
}

export interface ProcessPaymentOutput {
  paymentId: string;
  status: string;
}
