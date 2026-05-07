import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaymentEntity } from '../../../src/infra/database/typeorm/entities/payment.entity';
import { PostgresPaymentRepository } from '../../../src/infra/database/typeorm/repositories/payment.repository.impl';
import { Payment, PaymentMethod, PaymentStatus } from '../../../src/domain/aggregates/payment.aggregate';
import { Money } from '@app/shared';

describe('PostgresPaymentRepository Integration Tests', () => {
  let connections: Record<string, string>;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-payment'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  const createTestingModule = async () => {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connections.paymentDatabase,
          entities: [PaymentEntity],
          synchronize: true,
          dropSchema: false,
        }),
      ],
      providers: [
        {
          provide: PostgresPaymentRepository,
          useFactory: (dataSource: DataSource) => new PostgresPaymentRepository(dataSource),
          inject: [DataSource],
        },
      ],
    }).compile();
  };

  const createTestPayment = (paymentId?: string) => {
    const id = paymentId || uuidv4();
    return new Payment({
      id,
      orderId: uuidv4(),
      amount: Money.BRL(5000),
      method: PaymentMethod.CREDIT_CARD,
      paymentMethodToken: '4242',
      paymentMethodBrand: 'visa',
      customerId: uuidv4(),
    });
  };

  it('should save a new payment', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresPaymentRepository>(PostgresPaymentRepository);

    const payment = createTestPayment();
    await repo.save(payment);

    const found = await repo.findById(payment.getId());
    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(payment.getId());
    expect(found!.getOrderId()).toBe(payment.getOrderId());

    await module.close();
  }, { timeout: 30000 });

  it('should find payment by id', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresPaymentRepository>(PostgresPaymentRepository);

    const payment = createTestPayment();
    await repo.save(payment);
    const found = await repo.findById(payment.getId());

    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(payment.getId());
    expect(found!.getOrderId()).toBe(payment.getOrderId());
    expect(found!.getStatus()).toBe(PaymentStatus.PENDING);
    expect(found!.getMethod()).toBe(PaymentMethod.CREDIT_CARD);

    await module.close();
  }, { timeout: 30000 });

  it('should return null for non-existent payment', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresPaymentRepository>(PostgresPaymentRepository);

    const nonExistentId = uuidv4();
    const found = await repo.findById(nonExistentId);

    expect(found).toBeNull();

    await module.close();
  }, { timeout: 30000 });

  it('should update payment status', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresPaymentRepository>(PostgresPaymentRepository);

    const payment = createTestPayment();
    await repo.save(payment);

    payment.confirm();
    await repo.save(payment);

    const found = await repo.findById(payment.getId());
    expect(found!.getStatus()).toBe(PaymentStatus.CONFIRMED);

    await module.close();
  }, { timeout: 30000 });

  it('should handle payment refund', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresPaymentRepository>(PostgresPaymentRepository);

    const payment = createTestPayment();
    payment.confirm();
    await repo.save(payment);

    const refundAmount = Money.BRL(2000);
    payment.refund(refundAmount, 'Customer request');
    await repo.save(payment);

    const found = await repo.findById(payment.getId());
    expect(found!.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(found!.getRefundedAmount().amount).toBe(2000);

    await module.close();
  }, { timeout: 30000 });

  it('should handle full refund', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresPaymentRepository>(PostgresPaymentRepository);

    const payment = createTestPayment();
    payment.confirm();
    await repo.save(payment);

    const refundAmount = Money.BRL(5000);
    payment.refund(refundAmount, 'Customer request');
    await repo.save(payment);

    const found = await repo.findById(payment.getId());
    expect(found!.getStatus()).toBe(PaymentStatus.FULLY_REFUNDED);
    expect(found!.getRefundedAmount().amount).toBe(5000);

    await module.close();
  }, { timeout: 30000 });

  it('should delete payment', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresPaymentRepository>(PostgresPaymentRepository);

    const payment = createTestPayment();
    await repo.save(payment);

    await repo.delete(payment.getId());

    const found = await repo.findById(payment.getId());
    expect(found).toBeNull();

    await module.close();
  }, { timeout: 30000 });
});
