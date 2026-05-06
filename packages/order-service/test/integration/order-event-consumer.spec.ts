import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { DataSource } from 'typeorm';
import type { DomainEvent } from '@app/shared';
import { Money } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresOrderRepository } from '@infra/database/typeorm/repositories/order.repository.impl';
import { OrderConsumer } from '@infra/messaging/rabbitmq/order.consumer';
import { OrderEntity } from '@infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '@infra/database/typeorm/entities/order-item.entity';
import { Order } from '@domain/aggregates/order.aggregate';
import { OrderItem } from '@domain/value-objects/order-item.vo';
import { OrderStatusEnum } from '@domain/value-objects/order-status.vo';

const DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/orders';
const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';

describe('Order Consumer (Integration)', () => {
  let dataSource: DataSource;
  let publisherConnection: RabbitMQConnection;
  let consumerConnection: RabbitMQConnection;
  let repository: PostgresOrderRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [OrderEntity, OrderItemEntity],
      synchronize: true,
    });
    await dataSource.initialize();

    repository = new PostgresOrderRepository(dataSource);
    publisherConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    consumerConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Wait for connections to be established
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Start the consumer (no need for a pre-created order)
    const consumer = new OrderConsumer(consumerConnection, repository);
    await consumer.start();

    // Wait longer for RabbitMQ consumer setup to complete
    await new Promise((resolve) => setTimeout(resolve, 2000));

    console.log('[OrderConsumerTest] Setup complete, consumer ready');
  });

  afterAll(async () => {
    await dataSource.destroy();
    await publisherConnection.close();
    await consumerConnection.close();
  });

  it('should confirm order when payment.confirmed event arrives', async () => {
    // Create a fresh order for this test
    const testOrder = Order.create({
      customerId: 'customer-test-1',
      restaurantId: 'restaurant-test-1',
      items: [new OrderItem({
        productId: 'p-test-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
      })],
    });
    testOrder.clearDomainEvents();
    await repository.save(testOrder);
    const testOrderId = testOrder.getId();

    const event: DomainEvent = {
      eventId: 'evt-pay-1',
      eventType: 'payment.confirmed',
      occurredAt: new Date().toISOString(),
      aggregateId: 'payment-1',
      aggregateType: 'Payment',
      data: { orderId: testOrderId, paymentId: 'payment-1', amountCents: 2500, method: 'PIX' },
    };

    await publisherConnection.publish('payment.confirmed', event);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const order = await repository.findById(testOrderId);
    expect(order).not.toBeNull();
    expect(order!.getStatus()).toBe(OrderStatusEnum.CONFIRMED);
  });

  it('should mark order ready when order.ready event arrives', async () => {
    // Create a fresh confirmed order for this test
    const testOrder = Order.create({
      customerId: 'customer-test-2',
      restaurantId: 'restaurant-test-2',
      items: [new OrderItem({
        productId: 'p-test-2',
        productName: 'Pizza',
        quantity: 1,
        unitPrice: Money.BRL(30),
      })],
    });
    testOrder.confirm();
    testOrder.startPreparing(); // Add this step to follow proper state flow
    testOrder.clearDomainEvents();
    await repository.save(testOrder);
    const testOrderId = testOrder.getId();

    const event: DomainEvent = {
      eventId: 'evt-kitchen-1',
      eventType: 'order.ready',
      occurredAt: new Date().toISOString(),
      aggregateId: 'ticket-1',
      aggregateType: 'KitchenTicket',
      data: { orderId: testOrderId, kitchenTicketId: 'ticket-1', readyAt: new Date().toISOString() },
    };

    await publisherConnection.publish('order.ready', event);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const order = await repository.findById(testOrderId);
    expect(order).not.toBeNull();
    expect(order!.getStatus()).toBe(OrderStatusEnum.READY);
  });

  it('should cancel order when payment.rejected event arrives', async () => {
    // Create a new pending order for this test
    const newOrder = Order.create({
      customerId: 'customer-cancel-test',
      restaurantId: 'restaurant-cancel-test',
      items: [new OrderItem({
        productId: 'p-cancel',
        productName: 'Pizza',
        quantity: 1,
        unitPrice: Money.BRL(30),
      })],
    });
    newOrder.clearDomainEvents();
    await repository.save(newOrder);
    const cancelOrderId = newOrder.getId();

    const event: DomainEvent = {
      eventId: 'evt-pay-reject-1',
      eventType: 'payment.rejected',
      occurredAt: new Date().toISOString(),
      aggregateId: 'payment-rejected-1',
      aggregateType: 'Payment',
      data: {
        orderId: cancelOrderId,
        paymentId: 'payment-rejected-1',
        amountCents: 3000,
        method: 'PIX',
        reason: 'Insufficient funds',
      },
    };

    await publisherConnection.publish('payment.rejected', event);
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const order = await repository.findById(cancelOrderId);
    expect(order).not.toBeNull();
    expect(order!.getStatus()).toBe(OrderStatusEnum.CANCELLED);
  });
});
