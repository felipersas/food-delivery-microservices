export interface CreateOrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export interface CreateOrderInput {
  customerId: string;
  restaurantId: string;
  items: CreateOrderItemInput[];
}

export interface CreateOrderOutput {
  orderId: string;
  status: string;
  totalAmount: number;
}
