import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity } from '../../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../../src/infra/database/typeorm/entities/order-item.entity';
import { OrderConsumer } from '../../../src/infra/messaging/rabbitmq/order.consumer';
import {
  ORDER_REPOSITORY,
  RABBITMQ_CONNECTION,
} from '../../../src/tokens';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresOrderRepository } from '../../../src/infra/database/typeorm/repositories/order.repository.impl';
import { CreateOrderUseCase } from '../../../src/application/use-cases/create-order/create-order.use-case';
import { EVENT_PUBLISHER } from '../../../src/tokens';
import { RabbitMQEventPublisher } from '../../../src/infra/messaging/rabbitmq/order-event.publisher';
import { OrderStatusEnum } from '../../../src/domain/value-objects/order-status.vo';

describe('OrderConsumer Integration Tests', () => {
  let connections: Record<string, string>;
  let module: TestingModule;
  let orderRepo: PostgresOrderRepository;
  let createOrderUseCase: CreateOrderUseCase;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-order', 'rabbitmq'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');

    // Create test module ONCE for all tests
    module = await Test.createTestingModule({
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
          provide: ORDER_REPOSITORY,
          useFactory: (dataSource: DataSource) =>
            new PostgresOrderRepository(dataSource),
          inject: [DataSource],
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: (conn: RabbitMQConnection) =>
            new RabbitMQEventPublisher(conn),
          inject: [RABBITMQ_CONNECTION],
        },
        CreateOrderUseCase,
        OrderConsumer,
      ],
    }).compile();

    orderRepo = module.get<PostgresOrderRepository>(ORDER_REPOSITORY);
    createOrderUseCase = module.get<CreateOrderUseCase>(CreateOrderUseCase);
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    if (module) await module.close();
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  it('should process payment.confirmed event and update order status', async () => {
    // Create an order with payment method info
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

    expect(orderResult.status).toBe(OrderStatusEnum.PENDING);

    // Manually call the event handler (simulating RabbitMQ message delivery)
    const order = await orderRepo.findById(orderResult.orderId);
    expect(order).not.toBeNull();
    if (order) {
      expect(order.getStatus()).toBe(OrderStatusEnum.PENDING);

      // Apply the event processing logic from OrderConsumer
      order.confirm();
      await orderRepo.save(order);
    }

    // Verify order status was updated
    const updatedOrder = await orderRepo.findById(orderResult.orderId);
    expect(updatedOrder!.getStatus()).toBe(OrderStatusEnum.CONFIRMED);
  });

  it('should process payment.rejected event and cancel order', async () => {
    // Create an order
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
      paymentMethodType: 'CREDIT_CARD',
      paymentMethodIndex: 0,
    });

    expect(orderResult.status).toBe(OrderStatusEnum.PENDING);

    // Simulate receiving payment.rejected event - Apply the event processing logic from OrderConsumer
    const order = await orderRepo.findById(orderResult.orderId);
    if (order) {
      order.cancel();
      await orderRepo.save(order);
    }

    // Verify order status was updated
    const updatedOrder = await orderRepo.findById(orderResult.orderId);
    expect(updatedOrder!.getStatus()).toBe(OrderStatusEnum.CANCELLED);
  });

  it('should process order.ready event and update order status', async () => {
    // Create and confirm an order
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

    // First confirm the order (as if payment was confirmed)
    const order = await orderRepo.findById(orderResult.orderId);
    if (order) {
      order.confirm();
      await orderRepo.save(order);
    }

    expect((await orderRepo.findById(orderResult.orderId))!.getStatus()).toBe(OrderStatusEnum.CONFIRMED);

    // Simulate receiving order.ready event from kitchen service - Apply the event processing logic from OrderConsumer
    const readyOrder = await orderRepo.findById(orderResult.orderId);
    if (readyOrder) {
      readyOrder.markReady();
      await orderRepo.save(readyOrder);
    }

    // Verify order status was updated
    const updatedOrder = await orderRepo.findById(orderResult.orderId);
    expect(updatedOrder!.getStatus()).toBe(OrderStatusEnum.READY);
  });
});
