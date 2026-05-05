import { describe, it, expect } from 'bun:test';
import { ListCustomersUseCase } from '@application/use-cases/list-customers/list-customers.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import { Customer } from '@domain/aggregates/customer.aggregate';

function makeMockRepo(customers: Customer[] = []): CustomerRepository {
  return {
    findById: async (_id: string) => null,
    findByEmail: async () => null,
    findAll: async () => customers,
    save: async (_customer: any) => {},
    delete: async (_id: string) => {},
  };
}

describe('ListCustomersUseCase', () => {
  const defaultInput = {
    page: 0,
    limit: 20,
    sortBy: 'createdAt' as const,
    sortOrder: 'DESC' as const,
  };

  it('should return empty array when no customers exist', async () => {
    const repo = makeMockRepo([]);
    const useCase = new ListCustomersUseCase(repo);

    const result = await useCase.execute(defaultInput);

    expect(result.customers).toHaveLength(0);
  });

  it('should return list of all customers', async () => {
    const customer1 = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    const customer2 = Customer.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+5511888888888',
    });
    customer1.clearDomainEvents();
    customer2.clearDomainEvents();

    const repo = makeMockRepo([customer1, customer2]);
    const useCase = new ListCustomersUseCase(repo);

    const result = await useCase.execute(defaultInput);

    expect(result.customers).toHaveLength(2);
    expect(result.customers[0].name).toBe('John Doe');
    expect(result.customers[1].name).toBe('Jane Doe');
  });

  it('should include customer statistics', async () => {
    const customer = Customer.create({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+5511777777777',
    });
    customer.recordOrder(100);
    customer.recordOrder(50);
    customer.clearDomainEvents();

    const repo = makeMockRepo([customer]);
    const useCase = new ListCustomersUseCase(repo);

    const result = await useCase.execute(defaultInput);

    expect(result.customers).toHaveLength(1);
    expect(result.customers[0].totalOrders).toBe(2);
    expect(result.customers[0].totalSpent).toBe(150);
  });
});
