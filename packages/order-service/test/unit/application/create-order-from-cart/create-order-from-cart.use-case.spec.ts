import { describe, it, expect, mock } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { CreateOrderFromCartUseCase } from '@application/use-cases/create-order-from-cart/create-order-from-cart.use-case';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import type { CreateOrderFromCartInput } from '@application/use-cases/create-order-from-cart/create-order-from-cart.dto';

function makeMockRepo(): OrderRepository {
  const store = new Map();
  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    findByCustomerId: mock(async (_customerId: string) => []),
    save: mock(async (order: any) => { store.set(order.getId(), order); }),
    delete: mock(async (id: string) => { store.delete(id); }),
  };
}

function makeMockPublisher() {
  return {
    publishAll: mock(async (_events: ReadonlyArray<DomainEvent>) => {}),
  };
}

describe('CreateOrderFromCartUseCase', () => {
  it('should create an order from cart data and persist it', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateOrderFromCartUseCase(repo, publisher);

    const input: CreateOrderFromCartInput = {
      cartId: 'cart-123',
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [
        {
          productId: 'prod-1',
          productName: 'X-Burger',
          quantity: 2,
          priceCents: 2500,
        },
      ],
      totalAmountCents: 5000,
    };

    const result = await useCase.execute(input);

    expect(result.orderId).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should publish domain events after saving', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateOrderFromCartUseCase(repo, publisher);

    await useCase.execute({
      cartId: 'cart-1',
      customerId: 'c-1',
      restaurantId: 'r-1',
      items: [
        {
          productId: 'p-1',
          productName: 'Item',
          quantity: 1,
          priceCents: 1000,
        },
      ],
      totalAmountCents: 1000,
    });

    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
  });

  it('should handle multiple items from cart', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateOrderFromCartUseCase(repo, publisher);

    const result = await useCase.execute({
      cartId: 'cart-2',
      customerId: 'c-2',
      restaurantId: 'r-2',
      items: [
        {
          productId: 'p-1',
          productName: 'Burger',
          quantity: 1,
          priceCents: 2500,
        },
        {
          productId: 'p-2',
          productName: 'Fries',
          quantity: 2,
          priceCents: 1200,
        },
      ],
      totalAmountCents: 4900,
    });

    expect(result.orderId).toBeDefined();
    expect(repo.save).toHaveBeenCalledTimes(1);
  });
});
