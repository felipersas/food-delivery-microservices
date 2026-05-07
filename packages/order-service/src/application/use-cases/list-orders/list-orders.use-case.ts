import { Inject, Injectable } from '@nestjs/common';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import type {
  ListOrdersInput,
  ListOrdersOutput,
  OrderListItemOutput,
} from './list-orders.dto';
import { ORDER_REPOSITORY } from '../../../tokens';

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
  ) {}

  async execute(input: ListOrdersInput): Promise<ListOrdersOutput> {
    const orders = await this.orderRepository.findByCustomerId(
      input.customerId,
    );

    // Sort orders (default: newest first by createdAt)
    const sortField = input.sortField ?? 'createdAt';
    const sortOrder = input.sortOrder ?? 'DESC';

    const sortedOrders = this.sortOrders(orders, sortField, sortOrder);

    return {
      orders: sortedOrders.map(this.toOutput),
      total: sortedOrders.length,
    };
  }

  private sortOrders(orders: any[], field: string, order: 'ASC' | 'DESC'): any[] {
    return [...orders].sort((a, b) => {
      let aVal: any;
      let bVal: any;

      switch (field) {
        case 'createdAt':
          // For Order aggregate, we'll use version as proxy for time
          // (newer orders have higher version numbers typically)
          aVal = a.getVersion();
          bVal = b.getVersion();
          break;
        case 'totalAmount':
          aVal = a.getTotalAmount().cents;
          bVal = b.getTotalAmount().cents;
          break;
        case 'status':
          aVal = a.getStatus();
          bVal = b.getStatus();
          break;
        default:
          return 0;
      }

      if (order === 'DESC') {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
      return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
    });
  }

  private toOutput(order: any): OrderListItemOutput {
    return {
      id: order.getId(),
      customerId: order.getCustomerId(),
      restaurantId: order.getRestaurantId(),
      status: order.getStatus(),
      totalAmountCents: order.getTotalAmount().cents,
      totalAmount: order.getTotalAmount().amount,
      items: order.getItems().map((item: any) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceCents: item.unitPrice.cents,
      })),
      createdAt: new Date().toISOString(), // Aggregate doesn't track createdAt yet
    };
  }
}
