export interface GetOrderOutput {
  orderId: string;
  customerId: string;
  restaurantId: string;
  status: string;
  totalAmount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    unitPrice: number;
  }>;
}
