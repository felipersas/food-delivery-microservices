import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { CreateOrderUseCase } from '@application/use-cases/create-order/create-order.use-case';
import { InMemoryOrderRepository } from '@infra/database/memory/order.repository';
import { RabbitMQEventPublisher } from '@infra/messaging/rabbitmq/order-event.publisher';
import type { CreateOrderInput } from '@application/use-cases/create-order/create-order.dto';

const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const QUEUE = `test-order-events-${Date.now()}`;

describe('Order Event Publishing (Integration)', () => {
  let connection: RabbitMQConnection;
  let testConnection: RabbitMQConnection;
  let receivedEvents: DomainEvent[];

  beforeAll(async () => {
    receivedEvents = [];

    // Connection for the publisher (order-service)
    connection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Separate connection for the test subscriber
    testConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Subscribe before publishing
    await testConnection.subscribe(QUEUE, ['order.#'], async (event) => {
      receivedEvents.push(event);
    });

    // Give RabbitMQ a moment to set up bindings
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await connection.close();
    await testConnection.close();
  });

  it('should publish OrderCreated event to RabbitMQ when order is created', async () => {
    const repo = new InMemoryOrderRepository();
    const publisher = new RabbitMQEventPublisher(connection);
    const useCase = new CreateOrderUseCase(repo, publisher);

    const input: CreateOrderInput = {
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [
        { productId: 'p-1', productName: 'X-Burger', quantity: 2, unitPrice: 25 },
        { productId: 'p-2', productName: 'Fries', quantity: 1, unitPrice: 15 },
      ],
    };

    const result = await useCase.execute(input);

    // Wait for the message to be delivered
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const event = receivedEvents.find((e) => e.eventType === 'order.created');
    expect(event).toBeDefined();
    expect(event!.aggregateId).toBe(result.orderId);
    expect((event!.data as any).totalAmount).toBe(65);
    expect((event!.data as any).customerId).toBe('customer-1');
  });
});
