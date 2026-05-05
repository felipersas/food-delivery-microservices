import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import { AddCustomerAddressUseCase } from '@application/use-cases/add-customer-address/add-customer-address.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { AddCustomerAddressInput } from '@application/use-cases/add-customer-address/add-customer-address.dto';
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

describe('AddCustomerAddressUseCase', () => {
  let repo: CustomerRepository;
  let publisher: ReturnType<typeof makeMockPublisher>;
  let useCase: AddCustomerAddressUseCase;
  let customer: Customer;

  beforeEach(() => {
    repo = makeMockRepo();
    publisher = makeMockPublisher();
    useCase = new AddCustomerAddressUseCase(repo, publisher);
    customer = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    customer.clearDomainEvents();
  });

  it('should add address to customer', async () => {
    repo.findById = mock(async () => customer);

    const input: AddCustomerAddressInput = {
      customerId: customer.getId(),
      street: 'Av Paulista',
      number: '1000',
      complement: 'Apt 101',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    };

    await useCase.execute(input);

    expect(customer.getAddresses()).toHaveLength(1);
    expect(customer.getAddresses()[0].street).toBe('Av Paulista');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should set first address as default', async () => {
    repo.findById = mock(async () => customer);

    await useCase.execute({
      customerId: customer.getId(),
      street: 'Rua A',
      number: '1',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    });

    expect(customer.getAddresses()[0].isDefault).toBe(true);
  });

  it('should throw NotFoundException if customer not found', async () => {
    repo.findById = mock(async () => null);

    const input: AddCustomerAddressInput = {
      customerId: 'non-existent',
      street: 'Rua Test',
      number: '123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('should publish customer.address.added event', async () => {
    repo.findById = mock(async () => customer);

    await useCase.execute({
      customerId: customer.getId(),
      street: 'Rua Test',
      number: '123',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zipCode: '20040-002',
    });

    expect(publisher.publishAll).toHaveBeenCalled();
    const events = (publisher.publishAll as any).mock.calls[0][0] as DomainEvent[];
    const addressEvent = events.find((e: DomainEvent) => e.eventType === 'customer.address.added');
    expect(addressEvent).toBeDefined();
  });
});
