import { Inject, Injectable } from '@nestjs/common';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import type { GetOrderOutput } from './get-order.dto';

@Injectable()
export class GetOrderUseCase {
  constructor(@Inject('OrderRepository') private readonly orderRepository: OrderRepository) {}

  async execute(orderId: string): Promise<GetOrderOutput | null> {
    const order = await this.orderRepository.findById(orderId);
    if (!order) return null;

    return {
      orderId: order.getId(),
      customerId: order.getCustomerId(),
      restaurantId: order.getRestaurantId(),
      status: order.getStatus(),
      totalAmount: order.getTotalAmount().amount,
      items: order.getItems().map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.amount,
      })),
    };
  }
}
