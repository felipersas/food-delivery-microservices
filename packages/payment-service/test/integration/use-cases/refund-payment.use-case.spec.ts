import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaymentEntity } from '../../../src/infra/database/typeorm/entities/payment.entity';
import { RefundPaymentUseCase } from '../../../src/application/use-cases/refund-payment/refund-payment.use-case';
import { ProcessPaymentUseCase } from '../../../src/application/use-cases/process-payment/process-payment.use-case';
import { PAYMENT_REPOSITORY, EVENT_PUBLISHER } from '../../../src/tokens';
import { PostgresPaymentRepository } from '../../../src/infra/database/typeorm/repositories/payment.repository.impl';
import { PaymentStatus } from '../../../src/domain/aggregates/payment.aggregate';

describe('RefundPaymentUseCase Integration Tests', () => {
  let connections: Record<string, string>;
  let module: TestingModule;
  let processPaymentUseCase: ProcessPaymentUseCase;
  let refundUseCase: RefundPaymentUseCase;
  let repo: PostgresPaymentRepository;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-payment'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');

    // Create test module ONCE for all tests
    module = await Test.createTestingModule({
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
          provide: PAYMENT_REPOSITORY,
          useFactory: (dataSource: DataSource) => new PostgresPaymentRepository(dataSource),
          inject: [DataSource],
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: () => ({
            publishAll: async () => {},
          }),
        },
        {
          provide: ProcessPaymentUseCase,
          useFactory: (repo) => new ProcessPaymentUseCase(repo),
          inject: [PAYMENT_REPOSITORY],
        },
        {
          provide: RefundPaymentUseCase,
          useFactory: (repo, publisher) => new RefundPaymentUseCase(repo, publisher),
          inject: [PAYMENT_REPOSITORY, EVENT_PUBLISHER],
        },
      ],
    }).compile();

    processPaymentUseCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
    refundUseCase = module.get<RefundPaymentUseCase>(RefundPaymentUseCase);
    repo = module.get<PostgresPaymentRepository>(PAYMENT_REPOSITORY);
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    if (module) await module.close();
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  it('should process partial refund', async () => {
    // First create a confirmed payment
    const paymentResult = await processPaymentUseCase.execute({
      orderId: uuidv4(),
      amount: 100,
      method: 'CREDIT_CARD',
      customerId: uuidv4(),
      paymentMethodToken: '4242',
      paymentMethodBrand: 'visa',
    });

    expect(paymentResult.status).toBe(PaymentStatus.CONFIRMED);

    // Process partial refund
    const refundResult = await refundUseCase.execute({
      paymentId: paymentResult.paymentId,
      amount: 30,
      reason: 'Customer request',
    });

    expect(refundResult.paymentId).toBe(paymentResult.paymentId);
    expect(refundResult.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(refundResult.refundedAmount).toBe(30);
    expect(refundResult.refundId).toBeDefined();

    // Verify payment was updated
    const savedPayment = await repo.findById(paymentResult.paymentId);
    expect(savedPayment).not.toBeNull();
    expect(savedPayment!.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(savedPayment!.getRefundedAmount().amount).toBe(30);
  });

  it('should process full refund', async () => {
    // First create a confirmed payment
    const paymentResult = await processPaymentUseCase.execute({
      orderId: uuidv4(),
      amount: 50,
      method: 'PIX',
      customerId: uuidv4(),
      paymentMethodToken: 'mock-token',
    });

    expect(paymentResult.status).toBe(PaymentStatus.CONFIRMED);

    // Process full refund
    const refundResult = await refundUseCase.execute({
      paymentId: paymentResult.paymentId,
      amount: 50,
      reason: 'Order cancelled',
    });

    expect(refundResult.paymentId).toBe(paymentResult.paymentId);
    expect(refundResult.status).toBe(PaymentStatus.FULLY_REFUNDED);
    expect(refundResult.refundedAmount).toBe(50);

    // Verify payment was updated
    const savedPayment = await repo.findById(paymentResult.paymentId);
    expect(savedPayment).not.toBeNull();
    expect(savedPayment!.getStatus()).toBe(PaymentStatus.FULLY_REFUNDED);
    expect(savedPayment!.getRefundedAmount().amount).toBe(50);
  });

  it('should handle idempotent refunds with same refundId', async () => {
    const paymentResult = await processPaymentUseCase.execute({
      orderId: uuidv4(),
      amount: 100,
      method: 'PIX',
      customerId: uuidv4(),
      paymentMethodToken: 'mock-token',
    });

    const refundId = uuidv4();

    // First refund
    const refundResult1 = await refundUseCase.execute({
      paymentId: paymentResult.paymentId,
      amount: 25,
      reason: 'Partial refund',
      refundId,
    });

    expect(refundResult1.refundedAmount).toBe(25);

    // Second refund with same refundId (idempotent)
    const refundResult2 = await refundUseCase.execute({
      paymentId: paymentResult.paymentId,
      amount: 25,
      reason: 'Partial refund',
      refundId,
    });

    // Should still be 25, not 50 (idempotent)
    expect(refundResult2.refundedAmount).toBe(25);

    const savedPayment = await repo.findById(paymentResult.paymentId);
    expect(savedPayment!.getRefundedAmount().amount).toBe(25);
  });
});
