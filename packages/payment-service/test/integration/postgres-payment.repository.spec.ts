import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Money } from '@app/shared';
import { Payment, PaymentStatus, PaymentMethod } from '@domain/aggregates/payment.aggregate';
import { PostgresPaymentRepository } from '@infra/database/typeorm/repositories/payment.repository.impl';
import { PaymentEntity } from '@infra/database/typeorm/entities/payment.entity';
import { DataSource } from 'typeorm';

const DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5433/payments';

describe('PostgresPaymentRepository (Integration)', () => {
  let dataSource: DataSource;
  let repository: PostgresPaymentRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [PaymentEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new PostgresPaymentRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should save and retrieve a payment', async () => {
    const payment = new Payment({
      orderId: 'order-1',
      amount: Money.BRL(50),
      method: PaymentMethod.PIX,
    });

    payment.clearDomainEvents();
    await repository.save(payment);

    const found = await repository.findById(payment.getId());

    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(payment.getId());
    expect(found!.getOrderId()).toBe('order-1');
    expect(found!.getStatus()).toBe(PaymentStatus.PENDING);
    expect(found!.getAmount().amount).toBe(50);
    expect(found!.getMethod()).toBe(PaymentMethod.PIX);
  });

  it('should persist status transitions', async () => {
    const payment = new Payment({
      orderId: 'order-2',
      amount: Money.BRL(100),
      method: PaymentMethod.CREDIT_CARD,
    });
    payment.clearDomainEvents();

    await repository.save(payment);

    payment.confirm();
    payment.clearDomainEvents();
    await repository.save(payment);

    const found = await repository.findById(payment.getId());
    expect(found!.getStatus()).toBe(PaymentStatus.CONFIRMED);
    expect(found!.getVersion()).toBe(1);
  });

  it('should persist rejected payment', async () => {
    const payment = new Payment({
      orderId: 'order-3',
      amount: Money.BRL(75),
      method: PaymentMethod.DEBIT_CARD,
    });
    payment.clearDomainEvents();

    await repository.save(payment);

    payment.reject('insufficient funds');
    payment.clearDomainEvents();
    await repository.save(payment);

    const found = await repository.findById(payment.getId());
    expect(found!.getStatus()).toBe(PaymentStatus.REJECTED);
  });

  it('should delete a payment', async () => {
    const payment = new Payment({
      orderId: 'order-4',
      amount: Money.BRL(30),
      method: PaymentMethod.PIX,
    });
    payment.clearDomainEvents();

    await repository.save(payment);
    await repository.delete(payment.getId());

    const found = await repository.findById(payment.getId());
    expect(found).toBeNull();
  });

  it('should return null for non-existent payment', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });
});
