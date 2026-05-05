/**
 * DTO for kitchen job data processed by BullMQ
 */
export interface KitchenJobData {
  orderId: string;
  restaurantId: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}
