import { describe, it, expect, mock } from 'bun:test';
import { ConflictException } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import { CreateCustomerUseCase } from '@application/use-cases/create-customer/create-customer.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { CreateCustomerInput } from '@application/use-cases/create-customer/create-customer.dto';
import { Customer } from '@domain/aggregates/customer.aggregate';

function makeMockRepo(): CustomerRepository {
  const store = new Map();
  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    findByEmail: mock(async (email: string) => {
      for (const customer of store.values()) {
        if ((customer as any).email === email) return customer;
      }
      return null;
    }),
    findAll: mock(async () => []),
    save: mock(async (customer: any) => { store.set(customer.getId(), customer); }),
    delete: mock(async (id: string) => { store.delete(id); }),
  };
}

function makeMockPublisher() {
  return {
    publishAll: mock(async (_events: ReadonlyArray<DomainEvent>) => {}),
  };
}

describe('CreateCustomerUseCase', () => {
  it('should create a customer with ACTIVE status', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateCustomerUseCase(repo, publisher);

    const input: CreateCustomerInput = {
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    };

    const result = await useCase.execute(input);

    expect(result.customerId).toBeDefined();
    expect(result.status).toBe('ACTIVE');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should throw ConflictException if email already exists', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateCustomerUseCase(repo, publisher);

    const existingCustomer = Customer.create({
      name: 'Existing User',
      email: 'existing@example.com',
      phone: '+5511888888888',
    });
    (repo as any).store = new Map([['existing-1', existingCustomer]]);
    repo.findByEmail = mock(async () => existingCustomer);

    const input: CreateCustomerInput = {
      name: 'New User',
      email: 'existing@example.com',
      phone: '+5511777777777',
    };

    await expect(useCase.execute(input)).rejects.toThrow(ConflictException);
    await expect(useCase.execute(input)).rejects.toThrow('Email already registered');
  });

  it('should publish domain events after saving', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateCustomerUseCase(repo, publisher);

    await useCase.execute({
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+5511888888888',
    });

    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = (publisher.publishAll as any).mock.calls[0][0] as DomainEvent[];
    expect(events[0].eventType).toBe('customer.created');
  });
});
