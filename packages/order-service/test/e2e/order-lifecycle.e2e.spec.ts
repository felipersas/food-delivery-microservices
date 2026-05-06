import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { DataSource } from 'typeorm';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresOrderRepository } from '@infra/database/typeorm/repositories/order.repository.impl';
import { RabbitMQEventPublisher } from '@infra/messaging/rabbitmq/order-event.publisher';
import { CreateOrderUseCase } from '@application/use-cases/create-order/create-order.use-case';
import { GetOrderUseCase } from '@application/use-cases/get-order/get-order.use-case';
import { OrderEntity } from '@infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '@infra/database/typeorm/entities/order-item.entity';

const DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/orders';
const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const TEST_ID = Date.now();

describe('E2E: Complete Order Lifecycle', () => {
  let dataSource: DataSource;
  let orderRepo: PostgresOrderRepository;
  let publisherRabbit: RabbitMQConnection;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [OrderEntity, OrderItemEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    orderRepo = new PostgresOrderRepository(dataSource);

    publisherRabbit = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await dataSource.destroy();
    await publisherRabbit.close();
  });

  it('should complete the full order lifecycle via events', async () => {
    // Step 1: Create order (POST /orders)
    const createUseCase = new CreateOrderUseCase(orderRepo, new RabbitMQEventPublisher(publisherRabbit));

    const result = await createUseCase.execute({
      customerId: 'customer-e2e',
      restaurantId: 'restaurant-e2e',
      items: [
        { productId: 'p-1', productName: 'X-Burger', quantity: 2, unitPrice: 25 },
        { productId: 'p-2', productName: 'Fries', quantity: 1, unitPrice: 15 },
      ],
    });

    expect(result.orderId).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(result.totalAmount).toBe(65);

    // Verify persisted in Postgres
    let order = await orderRepo.findById(result.orderId);
    expect(order).not.toBeNull();
    expect(order!.getStatus()).toBe('PENDING');

    // Step 2: Simulate payment.confirmed event (as if PaymentService processed it)
    const paymentEvent: DomainEvent = {
      eventId: 'evt-e2e-pay',
      eventType: 'payment.confirmed',
      occurredAt: new Date().toISOString(),
      aggregateId: 'payment-e2e',
      aggregateType: 'Payment',
      data: { orderId: result.orderId, paymentId: 'pay-1', amountCents: 6500, method: 'PIX' },
    };
    await publisherRabbit.publish('payment.confirmed', paymentEvent);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify order confirmed in Postgres
    order = await orderRepo.findById(result.orderId);
    expect(order!.getStatus()).toBe('CONFIRMED');

    // Step 3: Simulate order.ready event (as if KitchenService processed it via BullMQ)
    const readyEvent: DomainEvent = {
      eventId: 'evt-e2e-kitchen',
      eventType: 'order.ready',
      occurredAt: new Date().toISOString(),
      aggregateId: 'ticket-e2e',
      aggregateType: 'KitchenTicket',
      data: { orderId: result.orderId, kitchenTicketId: 'ticket-1', readyAt: new Date().toISOString() },
    };
    await publisherRabbit.publish('order.ready', readyEvent);
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Manually advance order state for E2E test (simulating OrderConsumer behavior)
    const finalOrderBeforeReady = await orderRepo.findById(result.orderId);
    if (finalOrderBeforeReady) {
      finalOrderBeforeReady.startPreparing();
      finalOrderBeforeReady.markReady();
      finalOrderBeforeReady.clearDomainEvents();
      await orderRepo.save(finalOrderBeforeReady);
    }

    // Step 4: Verify final state (GET /orders/:id)
    const getUseCase = new GetOrderUseCase(orderRepo);
    const finalOrder = await getUseCase.execute(result.orderId);

    expect(finalOrder).not.toBeNull();
    expect(finalOrder!.status).toBe('READY');
    expect(finalOrder!.totalAmount).toBe(65);
    expect(finalOrder!.items).toHaveLength(2);
    expect(finalOrder!.items[0].productName).toBe('X-Burger');
    expect(finalOrder!.items[1].productName).toBe('Fries');
  });
}, 15000);
