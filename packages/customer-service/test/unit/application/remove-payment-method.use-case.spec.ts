import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { NotFoundException } from '@nestjs/common';
import { DomainException } from '@app/shared';
import type { DomainEvent } from '@app/shared';
import { RemovePaymentMethodUseCase } from '@application/use-cases/remove-payment-method/remove-payment-method.use-case';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { RemovePaymentMethodInput } from '@application/use-cases/remove-payment-method/remove-payment-method.dto';
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

describe('RemovePaymentMethodUseCase', () => {
  let repo: CustomerRepository;
  let publisher: ReturnType<typeof makeMockPublisher>;
  let useCase: RemovePaymentMethodUseCase;
  let customer: Customer;

  beforeEach(() => {
    repo = makeMockRepo();
    publisher = makeMockPublisher();
    useCase = new RemovePaymentMethodUseCase(repo, publisher);
    customer = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    customer.savePaymentMethod({
      token: '1111',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2026,
    });
    customer.savePaymentMethod({
      token: '2222',
      brand: 'mastercard',
      expiryMonth: 6,
      expiryYear: 2027,
    });
    customer.clearDomainEvents();
  });

  it('should remove payment method by index', async () => {
    repo.findById = mock(async () => customer);

    const input: RemovePaymentMethodInput = {
      customerId: customer.getId(),
      paymentMethodIndex: 0,
    };

    await useCase.execute(input);

    expect(customer.getPaymentMethods()).toHaveLength(1);
    expect(customer.getPaymentMethods()[0].token).toBe('2222');
    expect(repo.save).toHaveBeenCalledTimes(1);
  });

  it('should make first remaining method default when removing default', async () => {
    repo.findById = mock(async () => customer);

    const input: RemovePaymentMethodInput = {
      customerId: customer.getId(),
      paymentMethodIndex: 1,
    };

    await useCase.execute(input);

    expect(customer.getPaymentMethods()).toHaveLength(1);
    expect(customer.getPaymentMethods()[0].isDefault).toBe(true);
  });

  it('should throw NotFoundException if customer not found', async () => {
    repo.findById = mock(async () => null);

    const input: RemovePaymentMethodInput = {
      customerId: 'non-existent',
      paymentMethodIndex: 0,
    };

    await expect(useCase.execute(input)).rejects.toThrow(NotFoundException);
  });

  it('should throw DomainException for invalid payment method index', async () => {
    repo.findById = mock(async () => customer);

    const input: RemovePaymentMethodInput = {
      customerId: customer.getId(),
      paymentMethodIndex: 99,
    };

    await expect(useCase.execute(input)).rejects.toThrow(DomainException);
  });

  it('should publish customer.payment-method.removed event', async () => {
    repo.findById = mock(async () => customer);

    await useCase.execute({
      customerId: customer.getId(),
      paymentMethodIndex: 0,
    });

    expect(publisher.publishAll).toHaveBeenCalled();
    const events = (publisher.publishAll as any).mock.calls[0][0] as DomainEvent[];
    const pmEvent = events.find((e: DomainEvent) => e.eventType === 'customer.payment-method.removed');
    expect(pmEvent).toBeDefined();
  });
});
