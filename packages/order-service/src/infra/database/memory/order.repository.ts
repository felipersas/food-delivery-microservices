import type { Order } from '../../domain/aggregates/order.aggregate';
import type { OrderRepository } from '../../domain/repositories/order.repository.interface';

export class InMemoryOrderRepository implements OrderRepository {
  private orders: Map<string, Order> = new Map();

  async findById(id: string): Promise<Order | null> {
    return this.orders.get(id) ?? null;
  }

  async save(aggregate: Order): Promise<void> {
    this.orders.set(aggregate.getId(), aggregate);
  }

  async delete(id: string): Promise<void> {
    this.orders.delete(id);
  }
}
