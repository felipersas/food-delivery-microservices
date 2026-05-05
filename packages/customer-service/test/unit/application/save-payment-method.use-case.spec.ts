import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import { SavePaymentMethodUseCase } from '@application/use-cases/save-payment-method/save-payment-method.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { SavePaymentMethodInput } from '@application/use-cases/save-payment-method/save-payment-method.dto';
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

describe('SavePaymentMethodUseCase', () => {
  let repo: CustomerRepository;
  let publisher: ReturnType<typeof makeMockPublisher>;
  let useCase: SavePaymentMethodUseCase;
  let customer: Customer;

  beforeEach(() => {
    repo = makeMockRepo();
    publisher = makeMockPublisher();
    useCase = new SavePaymentMethodUseCase(repo, publisher);
    customer = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    customer.clearDomainEvents();
  });

  it('should save payment method to customer', async () => {
    repo.findById = mock(async () => customer);

    const input: SavePaymentMethodInput = {
      customerId: customer.getId(),
      token: '1234',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2026,
    };

    await useCase.execute(input);

    expect(customer.getPaymentMethods()).toHaveLength(1);
    expect(customer.getPaymentMethods()[0].token).toBe('1234');
    expect(customer.getPaymentMethods()[0].brand).toBe('visa');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should set first payment method as default', async () => {
    repo.findById = mock(async () => customer);

    await useCase.execute({
      customerId: customer.getId(),
      token: '1111',
      brand: 'mastercard',
      expiryMonth: 6,
      expiryYear: 2027,
    });

    expect(customer.getPaymentMethods()[0].isDefault).toBe(true);
  });

  it('should throw NotFoundException if customer not found', async () => {
    repo.findById = mock(async () => null);

    const input: SavePaymentMethodInput = {
      customerId: 'non-existent',
      token: '1234',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2026,
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('should publish customer.payment-method.added event', async () => {
    repo.findById = mock(async () => customer);

    await useCase.execute({
      customerId: customer.getId(),
      token: '4321',
      brand: 'amex',
      expiryMonth: 3,
      expiryYear: 2027,
    });

    expect(publisher.publishAll).toHaveBeenCalled();
    const events = (publisher.publishAll as any).mock.calls[0][0] as DomainEvent[];
    const pmEvent = events.find((e: DomainEvent) => e.eventType === 'customer.payment-method.added');
    expect(pmEvent).toBeDefined();
    expect((pmEvent!.data as any).brand).toBe('amex');
  });
});
