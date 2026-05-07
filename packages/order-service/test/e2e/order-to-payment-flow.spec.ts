import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity } from '../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../src/infra/database/typeorm/entities/order-item.entity';
import { CreateOrderUseCase } from '../../src/application/use-cases/create-order/create-order.use-case';
import {
  ORDER_REPOSITORY,
  EVENT_PUBLISHER,
  RABBITMQ_CONNECTION,
} from '../../src/tokens';
import { RabbitMQEventPublisher } from '../../src/infra/messaging/rabbitmq/order-event.publisher';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresOrderRepository } from '../../src/infra/database/typeorm/repositories/order.repository.impl';
import { OrderStatusEnum } from '../../src/domain/value-objects/order-status.vo';
import type { DomainEvent } from '@app/shared';

// Dynamic imports for payment service (avoiding direct import issues)
const loadPaymentService = async () => {
  const paymentPath = '../../../payment-service/src';
  return {
    PaymentEntity: (await import(`${paymentPath}/infra/database/typeorm/entities/payment.entity`)).PaymentEntity,
    Payment: (await import(`${paymentPath}/domain/aggregates/payment.aggregate`)).Payment,
    ProcessPaymentUseCase: (await import(`${paymentPath}/application/use-cases/process-payment/process-payment.use-case`)).ProcessPaymentUseCase,
    PostgresPaymentRepository: (await import(`${paymentPath}/infra/database/typeorm/repositories/payment.repository.impl`)).PostgresPaymentRepository,
    PAYMENT_REPOSITORY: (await import(`${paymentPath}/tokens`)).PAYMENT_REPOSITORY,
  };
};

describe('Order-to-Payment E2E Flow', () => {
  let connections: Record<string, string>;

  beforeAll(
    async () => {
      console.log('[beforeAll] Starting Docker Compose environment...');

      connections = await TestCompose.start({
        services: ['postgres-order', 'postgres-payment', 'rabbitmq'],
        env: { TEST_MODE: 'e2e' },
      });

      console.log('[beforeAll] Environment started');
    },
    { timeout: 120000 },
  );

  afterAll(
    async () => {
      console.log('[afterAll] Stopping Docker Compose environment...');
      await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
      console.log('[afterAll] Environment stopped');
    },
    { timeout: 30000 },
  );

  const createOrderModule = async () => {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connections.orderDatabase,
          entities: [OrderEntity, OrderItemEntity],
          synchronize: true,
          dropSchema: false,
        }),
      ],
      providers: [
        {
          provide: RABBITMQ_CONNECTION,
          useFactory: () =>
            new RabbitMQConnection({
              url: connections.rabbitmqUrl,
              exchange: 'food-ordering',
            }),
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: (conn: RabbitMQConnection) =>
            new RabbitMQEventPublisher(conn),
          inject: [RABBITMQ_CONNECTION],
        },
        {
          provide: ORDER_REPOSITORY,
          useFactory: (dataSource: DataSource) =>
            new PostgresOrderRepository(dataSource),
          inject: [DataSource],
        },
        CreateOrderUseCase,
      ],
    }).compile();
  };

  const createPaymentModule = async (paymentClasses: any) => {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connections.paymentDatabase,
          entities: [paymentClasses.PaymentEntity],
          synchronize: true,
          dropSchema: false,
        }),
      ],
      providers: [
        {
          provide: paymentClasses.PAYMENT_REPOSITORY,
          useFactory: (dataSource: DataSource) =>
            new paymentClasses.PostgresPaymentRepository(dataSource),
          inject: [DataSource],
        },
        {
          provide: paymentClasses.ProcessPaymentUseCase,
          useFactory: (repo) => new paymentClasses.ProcessPaymentUseCase(repo),
          inject: [paymentClasses.PAYMENT_REPOSITORY],
        },
      ],
    }).compile();
  };

  it(
    'should complete order-to-payment flow with event-driven communication',
    async () => {
      // Load payment service classes dynamically
      const paymentClasses = await loadPaymentService();

      // Setup: Create both service modules
      const orderModule = await createOrderModule();
      const paymentModule = await createPaymentModule(paymentClasses);

      // Capture published events from order creation
      const publishedEvents: DomainEvent[] = [];
      const eventPublisher =
        orderModule.get<RabbitMQEventPublisher>(EVENT_PUBLISHER);
      const originalPublishAll = eventPublisher.publishAll.bind(eventPublisher);
      eventPublisher.publishAll = async (events) => {
        publishedEvents.push(...events);
        await originalPublishAll(events);
      };

      // Step 1: Create an order (this emits order.created event)
      const createOrderUseCase =
        orderModule.get<CreateOrderUseCase>(CreateOrderUseCase);
      const orderResult = await createOrderUseCase.execute({
        customerId: uuidv4(),
        restaurantId: uuidv4(),
        items: [
          {
            productId: 'product-1',
            productName: 'X-Burger',
            quantity: 2,
            unitPrice: 50,
          },
        ],
        paymentMethodType: 'PIX',
        paymentMethodIndex: 0,
      });

      expect(orderResult.orderId).toBeDefined();
      expect(orderResult.status).toBe('PENDING');
      expect(orderResult.totalAmount).toBe(100);

      // Verify order.created event was published
      const orderCreatedEvent = publishedEvents.find(
        (e) => e.eventType === 'order.created',
      );
      expect(orderCreatedEvent).toBeDefined();
      expect(orderCreatedEvent!.data.orderId).toBe(orderResult.orderId);

      // Step 2: Simulate PaymentConsumer receiving the event
      const processPaymentUseCase = paymentModule.get<any>(
        paymentClasses.ProcessPaymentUseCase,
      );

      // Simulate the PaymentConsumer logic
      const event = orderCreatedEvent!;
      const eventData = event.data as any;

      const paymentResult = await processPaymentUseCase.execute({
        orderId: eventData.orderId,
        amount: eventData.totalAmountCents / 100, // Convert cents to decimal
        method: 'PIX',
        customerId: eventData.customerId,
        paymentMethodToken: 'mock-token', // Required for payment confirmation
      });

      expect(paymentResult.paymentId).toBeDefined();
      expect(paymentResult.status).toBe('CONFIRMED'); // Amount is 100, which is < 1000, so it gets confirmed

      // Step 3: Verify payment was persisted to database
      const paymentRepo = paymentModule.get<any>(
        paymentClasses.PAYMENT_REPOSITORY,
      );
      const savedPayment = await paymentRepo.findById(paymentResult.paymentId);

      expect(savedPayment).not.toBeNull();
      expect(savedPayment!.getOrderId()).toBe(orderResult.orderId);
      expect(savedPayment!.getStatus()).toBe('CONFIRMED');
      expect(savedPayment!.getAmount().amount).toBe(100);

      // Step 4: Verify order status can be updated (simulating OrderConsumer)
      const orderRepo =
        orderModule.get<PostgresOrderRepository>(ORDER_REPOSITORY);
      const order = await orderRepo.findById(orderResult.orderId);
      expect(order).not.toBeNull();

      // Simulate payment.confirmed event processing
      if (order) {
        order.confirm();
        await orderRepo.save(order);
      }

      // Verify order status was updated
      const updatedOrder = await orderRepo.findById(orderResult.orderId);
      expect(updatedOrder!.getStatus()).toBe(OrderStatusEnum.CONFIRMED);

      await orderModule.close();
      await paymentModule.close();
    },
    { timeout: 30000 },
  );

  it(
    'should handle payment rejection for high-value orders',
    async () => {
      const paymentClasses = await loadPaymentService();
      const orderModule = await createOrderModule();
      const paymentModule = await createPaymentModule(paymentClasses);

      const publishedEvents: DomainEvent[] = [];
      const eventPublisher =
        orderModule.get<RabbitMQEventPublisher>(EVENT_PUBLISHER);
      const originalPublishAll = eventPublisher.publishAll.bind(eventPublisher);
      eventPublisher.publishAll = async (events) => {
        publishedEvents.push(...events);
        await originalPublishAll(events);
      };

      const createOrderUseCase =
        orderModule.get<CreateOrderUseCase>(CreateOrderUseCase);

      // Create a high-value order (total > 1000, which triggers rejection in ProcessPaymentUseCase)
      const orderResult = await createOrderUseCase.execute({
        customerId: uuidv4(),
        restaurantId: uuidv4(),
        items: [
          {
            productId: 'product-1',
            productName: 'X-Burger',
            quantity: 30, // 30 * 50 = 1500, which exceeds 1000 limit
            unitPrice: 50,
          },
        ],
        paymentMethodType: 'CREDIT_CARD',
        paymentMethodIndex: 0,
      });

      expect(orderResult.totalAmount).toBe(1500);

      const orderCreatedEvent = publishedEvents.find(
        (e) => e.eventType === 'order.created',
      );
      const processPaymentUseCase = paymentModule.get<any>(
        paymentClasses.ProcessPaymentUseCase,
      );
      const eventData = orderCreatedEvent!.data as any;

      const paymentResult = await processPaymentUseCase.execute({
        orderId: eventData.orderId,
        amount: eventData.totalAmountCents / 100,
        method: 'CREDIT_CARD',
        customerId: eventData.customerId,
      });

      // Verify payment was rejected due to high amount
      expect(paymentResult.status).toBe('REJECTED');

      // Verify payment was persisted with REJECTED status
      const paymentRepo = paymentModule.get<any>(
        paymentClasses.PAYMENT_REPOSITORY,
      );
      const savedPayment = await paymentRepo.findById(paymentResult.paymentId);

      expect(savedPayment!.getStatus()).toBe('REJECTED');

      await orderModule.close();
      await paymentModule.close();
    },
    { timeout: 30000 },
  );
});
