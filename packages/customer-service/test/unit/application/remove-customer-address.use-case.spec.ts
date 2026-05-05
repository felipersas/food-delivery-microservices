import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { DomainException } from '@app/shared';
import type { DomainEvent } from '@app/shared';
import { RemoveCustomerAddressUseCase } from '@application/use-cases/remove-customer-address/remove-customer-address.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { RemoveCustomerAddressInput } from '@application/use-cases/remove-customer-address/remove-customer-address.dto';
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

describe('RemoveCustomerAddressUseCase', () => {
  let repo: CustomerRepository;
  let publisher: ReturnType<typeof makeMockPublisher>;
  let useCase: RemoveCustomerAddressUseCase;
  let customer: Customer;

  beforeEach(() => {
    repo = makeMockRepo();
    publisher = makeMockPublisher();
    useCase = new RemoveCustomerAddressUseCase(repo, publisher);
    customer = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    customer.addAddress({
      street: 'Rua A',
      number: '1',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    });
    customer.addAddress({
      street: 'Rua B',
      number: '2',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-568',
    });
    customer.clearDomainEvents();
  });

  it('should remove address by index', async () => {
    repo.findById = mock(async () => customer);

    const input: RemoveCustomerAddressInput = {
      customerId: customer.getId(),
      addressIndex: 0,
    };

    await useCase.execute(input);

    expect(customer.getAddresses()).toHaveLength(1);
    expect(customer.getAddresses()[0].street).toBe('Rua B');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should make first remaining address default when removing default', async () => {
    repo.findById = mock(async () => customer);

    const input: RemoveCustomerAddressInput = {
      customerId: customer.getId(),
      addressIndex: 1,
    };

    await useCase.execute(input);

    expect(customer.getAddresses()).toHaveLength(1);
    expect(customer.getAddresses()[0].isDefault).toBe(true);
  });

  it('should throw NotFoundException if customer not found', async () => {
    repo.findById = mock(async () => null);

    const input: RemoveCustomerAddressInput = {
      customerId: 'non-existent',
      addressIndex: 0,
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('should throw DomainException for invalid address index', async () => {
    repo.findById = mock(async () => customer);

    const input: RemoveCustomerAddressInput = {
      customerId: customer.getId(),
      addressIndex: 99,
    };

    await expect(useCase.execute(input)).rejects.toThrow(DomainException);
  });

  it('should publish customer.address.removed event', async () => {
    repo.findById = mock(async () => customer);

    await useCase.execute({
      customerId: customer.getId(),
      addressIndex: 0,
    });

    expect(publisher.publishAll).toHaveBeenCalled();
    const events = (publisher.publishAll as any).mock.calls[0][0] as DomainEvent[];
    const addressEvent = events.find((e: DomainEvent) => e.eventType === 'customer.address.removed');
    expect(addressEvent).toBeDefined();
  });
});
