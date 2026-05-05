import { describe, it, expect, mock } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { GetCustomerUseCase } from '@application/use-cases/get-customer/get-customer.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import { Customer } from '@domain/aggregates/customer.aggregate';

function makeMockRepo(): CustomerRepository {
  const store = new Map();
  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    findByEmail: mock(async () => null),
    findAll: mock(async () => []),
    save: mock(async (customer: any) => { store.set(customer.getId(), customer); }),
    delete: mock(async (id: string) => { store.delete(id); }),
  };
}

describe('GetCustomerUseCase', () => {
  it('should return customer by id', async () => {
    const repo = makeMockRepo();
    const useCase = new GetCustomerUseCase(repo);

    const customer = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    customer.clearDomainEvents();
    repo.findById = mock(async () => customer);

    const result = await useCase.execute('customer-1');

    expect(result.customerId).toBe(customer.getId());
    expect(result.name).toBe('John Doe');
    expect(result.email).toBe('john@example.com');
  });

  it('should throw NotFoundException if customer not found', async () => {
    const repo = makeMockRepo();
    repo.findById = mock(async () => null);
    const useCase = new GetCustomerUseCase(repo);

    await expect(useCase.execute('non-existent')).rejects.toThrow(NotFoundException);
  });

  it('should include addresses and payment methods', async () => {
    const repo = makeMockRepo();
    const customer = Customer.create({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+5511888888888',
    });
    customer.addAddress({
      street: 'Rua A',
      number: '1',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    });
    customer.savePaymentMethod({
      token: '1234',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2026,
    });
    customer.clearDomainEvents();

    repo.findById = mock(async () => customer);
    const useCase = new GetCustomerUseCase(repo);

    const result = await useCase.execute('customer-1');

    expect(result.addresses).toHaveLength(1);
    expect(result.paymentMethods).toHaveLength(1);
  });
});
