import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import { UpdateCustomerProfileUseCase } from '@application/use-cases/update-customer-profile/update-customer-profile.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { UpdateCustomerProfileInput } from '@application/use-cases/update-customer-profile/update-customer-profile.dto';
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

function makeMockPublisher() {
  return {
    publishAll: mock(async (_events: ReadonlyArray<DomainEvent>) => {}),
  };
}

describe('UpdateCustomerProfileUseCase', () => {
  let repo: CustomerRepository;
  let publisher: ReturnType<typeof makeMockPublisher>;
  let useCase: UpdateCustomerProfileUseCase;
  let customer: Customer;

  beforeEach(() => {
    repo = makeMockRepo();
    publisher = makeMockPublisher();
    useCase = new UpdateCustomerProfileUseCase(repo, publisher);
    customer = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    customer.clearDomainEvents();
  });

  it('should update customer name', async () => {
    repo.findById = mock(async () => customer);

    const input: UpdateCustomerProfileInput = {
      customerId: customer.getId(),
      name: 'Jane Doe',
    };

    await useCase.execute(input);

    expect(customer.getName()).toBe('Jane Doe');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should update customer email', async () => {
    repo.findById = mock(async () => customer);

    const input: UpdateCustomerProfileInput = {
      customerId: customer.getId(),
      email: 'janedoe@example.com',
    };

    await useCase.execute(input);

    expect(customer.getEmail()).toBe('janedoe@example.com');
  });

  it('should update customer phone', async () => {
    repo.findById = mock(async () => customer);

    const input: UpdateCustomerProfileInput = {
      customerId: customer.getId(),
      phone: '+5511888888888',
    };

    await useCase.execute(input);

    expect(customer.getPhone()).toBe('+5511888888888');
  });

  it('should throw NotFoundException if customer not found', async () => {
    repo.findById = mock(async () => null);

    const input: UpdateCustomerProfileInput = {
      customerId: 'non-existent',
      name: 'Test',
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('should publish customer.updated event', async () => {
    repo.findById = mock(async () => customer);

    await useCase.execute({
      customerId: customer.getId(),
      name: 'Updated Name',
    });

    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = (publisher.publishAll as any).mock.calls[0][0] as DomainEvent[];
    expect(events[0].eventType).toBe('customer.updated');
  });
});
