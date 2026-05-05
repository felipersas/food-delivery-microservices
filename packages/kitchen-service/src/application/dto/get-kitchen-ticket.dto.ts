export interface GetKitchenTicketOutput {
  ticketId: string;
  orderId: string;
  status: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}
