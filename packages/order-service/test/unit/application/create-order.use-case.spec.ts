import { describe, it, expect, mock } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { CreateOrderUseCase } from '../../../src/application/use-cases/create-order/create-order.use-case';
import type { OrderRepository } from '../../../src/domain/repositories/order.repository.interface';
import type { CreateOrderInput } from '../../../src/application/use-cases/create-order/create-order.dto';

function makeMockRepo(): OrderRepository {
  const store = new Map();
  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    save: mock(async (order: any) => { store.set(order.getId(), order); }),
    delete: mock(async (id: string) => { store.delete(id); }),
  };
}

function makeMockPublisher() {
  return {
    publishAll: mock(async (_events: ReadonlyArray<DomainEvent>) => {}),
  };
}

describe('CreateOrderUseCase', () => {
  it('should create an order and persist it', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateOrderUseCase(repo, publisher);

    const input: CreateOrderInput = {
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [
        { productId: 'prod-1', productName: 'X-Burger', quantity: 2, price: 25 },
      ],
    };

    const result = await useCase.execute(input);

    expect(result.orderId).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(result.totalAmount).toBe(50);
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should publish domain events after saving', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateOrderUseCase(repo, publisher);

    await useCase.execute({
      customerId: 'c-1',
      restaurantId: 'r-1',
      items: [{ productId: 'p-1', productName: 'Item', quantity: 1, price: 10 }],
    });

    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
  });
});
