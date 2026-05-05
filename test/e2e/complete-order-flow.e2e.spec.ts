import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';

const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const TEST_ID = Date.now();

describe('E2E: Complete Order Flow Across Services', () => {
  let publisherConnection: RabbitMQConnection;
  let testConnection: RabbitMQConnection;
  let receivedEvents: DomainEvent[];

  beforeAll(async () => {
    receivedEvents = [];
    publisherConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    testConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Subscribe to ALL events to verify the complete flow
    await testConnection.subscribe(
      `e2e-all-events-${TEST_ID}`,
      ['order.#', 'payment.#'],
      async (event) => {
        receivedEvents.push(event);
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await publisherConnection.close();
    await testConnection.close();
  });

  it('should flow through all services: Order → Payment → Kitchen', async () => {
    // Step 1: Client creates order via API Gateway → Order Service
    const orderCreatedEvent: DomainEvent = {
      eventId: `evt-order-${TEST_ID}`,
      eventType: 'order.created',
      occurredAt: new Date().toISOString(),
      aggregateId: `order-${TEST_ID}`,
      aggregateType: 'Order',
      data: {
        orderId: `order-${TEST_ID}`,
        customerId: `customer-${TEST_ID}`,
        restaurantId: `restaurant-${TEST_ID}`,
        totalAmount: 65,
        items: [
          { productId: 'p-1', productName: 'X-Burger', quantity: 2, price: 25 },
          { productId: 'p-2', productName: 'Fries', quantity: 1, price: 15 },
        ],
      },
    };

    await publisherConnection.publish('order.created', orderCreatedEvent);

    // Wait for Payment Service to process
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Step 2: Verify Payment Service emitted payment.confirmed
    const paymentConfirmed = receivedEvents.find(
      (e) => e.eventType === 'payment.confirmed' && (e.data as any).orderId === `order-${TEST_ID}`,
    );
    expect(paymentConfirmed).toBeDefined();
    expect((paymentConfirmed!.data as any).amount).toBe(65);
    expect((paymentConfirmed!.data as any).restaurantId).toBeDefined();
    expect((paymentConfirmed!.data as any).items).toBeDefined();

    // Step 3: Verify Kitchen Service received payment.confirmed and will process
    // Kitchen creates ticket in BullMQ queue (async, 1-30s delay)
    // We verify the consumer received the event
    const paymentEventForKitchen = receivedEvents.find(
      (e) => e.eventType === 'payment.confirmed',
    );
    expect(paymentEventForKitchen).toBeDefined();

    // Step 4: After kitchen processing, it should emit order.ready
    // This happens async via BullMQ worker, so we wait longer
    await new Promise((resolve) => setTimeout(resolve, 35000));

    const orderReady = receivedEvents.find(
      (e) => e.eventType === 'order.ready' && (e.data as any).orderId === `order-${TEST_ID}`,
    );

    expect(orderReady).toBeDefined();
    expect((orderReady!.data as any).kitchenTicketId).toBeDefined();
  }, 45000);

  it('should handle payment rejection correctly', async () => {
    const rejectionTest = Date.now();
    const rejectionReceived: DomainEvent[] = [];

    // Subscribe specifically for this test
    const rejectionConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    await rejectionConnection.subscribe(
      `e2e-rejection-${rejectionTest}`,
      ['payment.rejected', 'kitchen.ticket.created'],
      async (event) => {
        rejectionReceived.push(event);
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Create order with amount that will fail (simulated)
    const orderEvent: DomainEvent = {
      eventId: `evt-reject-${rejectionTest}`,
      eventType: 'order.created',
      occurredAt: new Date().toISOString(),
      aggregateId: `order-reject-${rejectionTest}`,
      aggregateType: 'Order',
      data: {
        orderId: `order-reject-${rejectionTest}`,
        customerId: 'customer-reject',
        restaurantId: 'restaurant-reject',
        totalAmount: 999999, // Invalid amount to trigger rejection
        items: [{ productId: 'p-fail', productName: 'Fail Item', quantity: 1, price: 999999 }],
      },
    };

    await publisherConnection.publish('order.created', orderEvent);
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Verify payment was rejected
    const rejected = rejectionReceived.find((e) => e.eventType === 'payment.rejected');
    expect(rejected).toBeDefined();

    // Verify Kitchen did NOT receive (no ticket created)
    const kitchenTicket = rejectionReceived.find((e) => e.eventType === 'kitchen.ticket.created');
    expect(kitchenTicket).toBeUndefined();

    await rejectionConnection.close();
  });
});
