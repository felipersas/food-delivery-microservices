import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { KitchenConsumer } from '../../src/infra/messaging/rabbitmq/kitchen.consumer';

const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';

describe('Kitchen Consumer (Integration)', () => {
  let publisherConnection: RabbitMQConnection;
  let consumerConnection: RabbitMQConnection;
  let testConnection: RabbitMQConnection;
  let receivedEvents: DomainEvent[];

  beforeAll(async () => {
    receivedEvents = [];

    publisherConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    consumerConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    testConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    const consumer = new KitchenConsumer(consumerConnection);
    await consumer.start();

    await testConnection.subscribe(`test-kitchen-events-${Date.now()}`, ['order.ready'], async (event) => {
      receivedEvents.push(event);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await publisherConnection.close();
    await consumerConnection.close();
    await testConnection.close();
  });

  it('should consume order.created and publish order.ready', async () => {
    const orderCreatedEvent: DomainEvent = {
      eventId: 'evt-kitchen-1',
      eventType: 'order.created',
      occurredAt: new Date().toISOString(),
      aggregateId: 'order-456',
      aggregateType: 'Order',
      data: {
        orderId: 'order-456',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        totalAmount: 50,
        items: [
          { productId: 'p-1', productName: 'Burger', quantity: 2, price: 25 },
        ],
      },
    };

    await publisherConnection.publish('order.created', orderCreatedEvent);

    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const event = receivedEvents.find((e) => e.eventType === 'order.ready');
    expect(event).toBeDefined();
    expect((event!.data as any).orderId).toBe('order-456');
    expect((event!.data as any).kitchenTicketId).toBeDefined();
  });
});
