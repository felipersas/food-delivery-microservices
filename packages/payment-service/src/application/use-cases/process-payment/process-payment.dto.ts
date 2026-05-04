export interface ProcessPaymentInput {
  orderId: string;
  amount: number;
  method: string;
}

export interface ProcessPaymentOutput {
  paymentId: string;
  status: string;
}
