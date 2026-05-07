import type { Repository } from '@app/shared';
import type { Order } from '@domain/aggregates/order.aggregate';

export interface OrderRepository extends Repository<Order> {
  findByCustomerId(customerId: string): Promise<Order[]>;
}
