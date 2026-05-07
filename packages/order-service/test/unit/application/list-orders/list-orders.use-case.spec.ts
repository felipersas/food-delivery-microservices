import { describe, it, expect, mock } from 'bun:test';
import { ListOrdersUseCase } from '@application/use-cases/list-orders/list-orders.use-case';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import { Order } from '@domain/aggregates/order.aggregate';
import { OrderItem } from '@domain/value-objects/order-item.vo';
import { Money } from '@app/shared';
import type { ListOrdersInput } from '@application/use-cases/list-orders/list-orders.dto';

function makeMockRepo(orders: Order[] = []): OrderRepository {
  const ordersByCustomer = new Map<string, Order[]>();

  for (const order of orders) {
    const customerId = order.getCustomerId();
    if (!ordersByCustomer.has(customerId)) {
      ordersByCustomer.set(customerId, []);
    }
    ordersByCustomer.get(customerId)!.push(order);
  }

  return {
    findById: mock(async (_id: string) => null),
    findByCustomerId: mock(async (customerId: string) =>
      ordersByCustomer.get(customerId) ?? []
    ),
    save: mock(async (_order: Order) => {}),
    delete: mock(async (_id: string) => {}),
  };
}

describe('ListOrdersUseCase', () => {
  it('should return empty array when customer has no orders', async () => {
    const repo = makeMockRepo([]);
    const useCase = new ListOrdersUseCase(repo);

    const result = await useCase.execute({
      customerId: 'customer-1',
    });

    expect(result.orders).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('should return customer orders sorted by newest first', async () => {
    const order1 = Order.create({
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [
        OrderItem.create({
          productId: 'p1',
          productName: 'Item 1',
          quantity: 1,
          unitPrice: Money.BRL(10),
        }),
      ],
    });

    const order2 = Order.create({
      customerId: 'customer-1',
      restaurantId: 'restaurant-2',
      items: [
        OrderItem.create({
          productId: 'p2',
          productName: 'Item 2',
          quantity: 2,
          unitPrice: Money.BRL(20),
        }),
      ],
    });

    const repo = makeMockRepo([order1, order2]);
    const useCase = new ListOrdersUseCase(repo);

    const result = await useCase.execute({
      customerId: 'customer-1',
    });

    expect(result.orders).toHaveLength(2);
    expect(result.total).toBe(2);
    expect(repo.findByCustomerId).toHaveBeenCalledWith('customer-1');
  });

  it('should include order details in output', async () => {
    const order = Order.create({
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [
        OrderItem.create({
          productId: 'p1',
          productName: 'Burger',
          quantity: 2,
          unitPrice: Money.BRL(25),
        }),
      ],
    });

    const repo = makeMockRepo([order]);
    const useCase = new ListOrdersUseCase(repo);

    const result = await useCase.execute({
      customerId: 'customer-1',
    });

    expect(result.orders).toHaveLength(1);
    const outputOrder = result.orders[0];
    expect(outputOrder.id).toBeDefined();
    expect(outputOrder.customerId).toBe('customer-1');
    expect(outputOrder.restaurantId).toBe('restaurant-1');
    expect(outputOrder.status).toBe('PENDING');
    expect(outputOrder.items).toHaveLength(1);
    expect(outputOrder.items[0].productName).toBe('Burger');
  });

  it('should only return orders for the specified customer', async () => {
    const order1 = Order.create({
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [OrderItem.create({
        productId: 'p1',
        productName: 'Item 1',
        quantity: 1,
        unitPrice: Money.BRL(10),
      })],
    });

    const order2 = Order.create({
      customerId: 'customer-2',
      restaurantId: 'restaurant-2',
      items: [OrderItem.create({
        productId: 'p2',
        productName: 'Item 2',
        quantity: 1,
        unitPrice: Money.BRL(20),
      })],
    });

    const repo = makeMockRepo([order1, order2]);
    const useCase = new ListOrdersUseCase(repo);

    const result = await useCase.execute({
      customerId: 'customer-1',
    });

    expect(result.orders).toHaveLength(1);
    expect(result.orders[0].customerId).toBe('customer-1');
  });
});
