import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PaymentEntity } from '../../../src/infra/database/typeorm/entities/payment.entity';
import { ProcessPaymentUseCase } from '../../../src/application/use-cases/process-payment/process-payment.use-case';
import { PAYMENT_REPOSITORY, EVENT_PUBLISHER } from '../../../src/tokens';
import { RabbitMQEventPublisher } from '../../../src/infra/messaging/rabbitmq/payment-event.publisher';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresPaymentRepository } from '../../../src/infra/database/typeorm/repositories/payment.repository.impl';
import { PaymentStatus } from '../../../src/domain/aggregates/payment.aggregate';

describe('ProcessPaymentUseCase Integration Tests', () => {
  let connections: Record<string, string>;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-payment', 'rabbitmq'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  it('should process payment and confirm for valid amount', async () => {
    const module = await Test.createTestingModule({
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
          provide: 'RabbitMQConnection',
          useFactory: () =>
            new RabbitMQConnection({
              url: connections.rabbitmqUrl,
              exchange: 'food-ordering',
            }),
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
          inject: ['RabbitMQConnection'],
        },
        {
          provide: PAYMENT_REPOSITORY,
          useFactory: (dataSource: DataSource) => new PostgresPaymentRepository(dataSource),
          inject: [DataSource],
        },
        {
          provide: ProcessPaymentUseCase,
          useFactory: (repo) => new ProcessPaymentUseCase(repo),
          inject: [PAYMENT_REPOSITORY],
        },
      ],
    }).compile();

    const useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
    const repo = module.get<PostgresPaymentRepository>(PAYMENT_REPOSITORY);

    const result = await useCase.execute({
      orderId: uuidv4(),
      amount: 50,
      method: 'PIX',
      customerId: uuidv4(),
      paymentMethodToken: 'mock-token',
    });

    expect(result.paymentId).toBeDefined();
    expect(result.status).toBe(PaymentStatus.CONFIRMED);

    // Verify payment was persisted
    const savedPayment = await repo.findById(result.paymentId);
    expect(savedPayment).not.toBeNull();
    expect(savedPayment!.getStatus()).toBe(PaymentStatus.CONFIRMED);

    await module.close();
  }, { timeout: 30000 });

  it('should reject payment for high-value amounts', async () => {
    const module = await Test.createTestingModule({
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
          provide: 'RabbitMQConnection',
          useFactory: () =>
            new RabbitMQConnection({
              url: connections.rabbitmqUrl,
              exchange: 'food-ordering',
            }),
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
          inject: ['RabbitMQConnection'],
        },
        {
          provide: PAYMENT_REPOSITORY,
          useFactory: (dataSource: DataSource) => new PostgresPaymentRepository(dataSource),
          inject: [DataSource],
        },
        {
          provide: ProcessPaymentUseCase,
          useFactory: (repo) => new ProcessPaymentUseCase(repo),
          inject: [PAYMENT_REPOSITORY],
        },
      ],
    }).compile();

    const useCase = module.get<ProcessPaymentUseCase>(ProcessPaymentUseCase);
    const repo = module.get<PostgresPaymentRepository>(PAYMENT_REPOSITORY);

    const result = await useCase.execute({
      orderId: uuidv4(),
      amount: 1500, // Exceeds 1000 limit
      method: 'CREDIT_CARD',
      customerId: uuidv4(),
      paymentMethodToken: '4242',
      paymentMethodBrand: 'visa',
    });

    expect(result.paymentId).toBeDefined();
    expect(result.status).toBe(PaymentStatus.REJECTED);

    // Verify payment was persisted with REJECTED status
    const savedPayment = await repo.findById(result.paymentId);
    expect(savedPayment).not.toBeNull();
    expect(savedPayment!.getStatus()).toBe(PaymentStatus.REJECTED);

    await module.close();
  }, { timeout: 30000 });
});
