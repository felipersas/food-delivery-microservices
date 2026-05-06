import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { PaymentConsumer } from '@infra/messaging/rabbitmq/payment.consumer';
import { ProcessPaymentUseCase } from '@application/use-cases/process-payment/process-payment.use-case';
import { InMemoryPaymentRepository } from '@infra/database/memory/payment.repository';

const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';

describe('Payment Consumer (Integration)', () => {
  let publisherConnection: RabbitMQConnection;
  let consumerConnection: RabbitMQConnection;
  let testConnection: RabbitMQConnection;
  let receivedEvents: DomainEvent[];

  beforeAll(async () => {
    receivedEvents = [];

    publisherConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    consumerConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    testConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Start the payment consumer
    const paymentRepository = new InMemoryPaymentRepository();
    const consumer = new PaymentConsumer(
      consumerConnection,
      new ProcessPaymentUseCase(paymentRepository),
    );
    await consumer.start();

    // Subscribe to payment events with a unique test queue
    await testConnection.subscribe(`test-payment-events-${Date.now()}`, ['payment.#'], async (event) => {
      receivedEvents.push(event);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await publisherConnection.close();
    await consumerConnection.close();
    await testConnection.close();
  });

  it('should consume order.created and publish payment.confirmed', async () => {
    const orderCreatedEvent: DomainEvent = {
      eventId: 'evt-1',
      eventType: 'order.created',
      occurredAt: new Date().toISOString(),
      aggregateId: 'order-123',
      aggregateType: 'Order',
      data: {
        orderId: 'order-123',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        totalAmountCents: 6500, // 65 BRL = 6500 cents
        items: [
          { productId: 'p-1', productName: 'Burger', quantity: 2, priceCents: 2500 }, // 25 BRL = 2500 cents
        ],
      },
    };

    await publisherConnection.publish('order.created', orderCreatedEvent);

    // Wait for consumer to process and publish
    await new Promise((resolve) => setTimeout(resolve, 2000));

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const event = receivedEvents.find((e) => e.eventType === 'payment.confirmed');
    expect(event).toBeDefined();
    expect((event!.data as any).orderId).toBe('order-123');
    expect((event!.data as any).amountCents).toBe(6500); // 65 BRL = 6500 cents
  });
});
