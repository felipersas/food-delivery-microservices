import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { KitchenConsumer } from '@infra/messaging/rabbitmq/kitchen.consumer';
import { KitchenQueue } from '@infra/queue/kitchen.queue';
import { KitchenWorkerService } from '@application/workers/kitchen.worker';
import { ProcessKitchenTicketUseCase } from '@application/use-cases/process-kitchen-ticket/process-kitchen-ticket.use-case';
import { RabbitMQEventPublisher } from '@infra/messaging/rabbitmq/kitchen-event.publisher';
import { InMemoryKitchenTicketRepository } from '@infra/database/memory/kitchen-ticket.repository';

const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const REDIS_OPTS = { host: 'localhost', port: 6379 };
const QUEUE_NAME = `kitchen-consumer-test-${Date.now()}`;

describe('Kitchen Consumer (Integration)', () => {
  let publisherConnection: RabbitMQConnection;
  let consumerConnection: RabbitMQConnection;
  let rabbitForWorker: RabbitMQConnection;
  let testConnection: RabbitMQConnection;
  let receivedEvents: DomainEvent[];
  let workerService: KitchenWorkerService;
  let kitchenQueue: KitchenQueue;

  beforeAll(async () => {
    receivedEvents = [];

    publisherConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    consumerConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    rabbitForWorker = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    testConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    kitchenQueue = new KitchenQueue(REDIS_OPTS, QUEUE_NAME);
    const consumer = new KitchenConsumer(consumerConnection, kitchenQueue);
    await consumer.start();

    // Create ProcessKitchenTicketUseCase with dependencies
    const ticketRepo = new InMemoryKitchenTicketRepository();
    const eventPublisher = new RabbitMQEventPublisher(rabbitForWorker);
    const processTicketUseCase = new ProcessKitchenTicketUseCase(ticketRepo, eventPublisher);

    // Start BullMQ worker
    workerService = new KitchenWorkerService(REDIS_OPTS, QUEUE_NAME, processTicketUseCase);
    workerService.getWorker();

    await testConnection.subscribe(`test-kitchen-events-${Date.now()}`, ['order.ready'], async (event) => {
      receivedEvents.push(event);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Store for cleanup
    (globalThis as any).__testWorker = workerService;
    (globalThis as any).__testQueue = kitchenQueue;
  });

  afterAll(async () => {
    await publisherConnection.close();
    await consumerConnection.close();
    await rabbitForWorker.close();
    await testConnection.close();
    await (globalThis as any).__testWorker?.close();
    await (globalThis as any).__testQueue?.close();
  });

  it('should consume payment.confirmed, enqueue BullMQ job, and publish order.ready', async () => {
    const paymentConfirmedEvent: DomainEvent = {
      eventId: 'evt-kitchen-1',
      eventType: 'payment.confirmed',
      occurredAt: new Date().toISOString(),
      aggregateId: 'payment-456',
      aggregateType: 'Payment',
      data: {
        orderId: 'order-456',
        restaurantId: 'restaurant-1',
        items: [
          { productId: 'p-1', productName: 'Burger', quantity: 2 },
        ],
      },
    };

    await publisherConnection.publish('payment.confirmed', paymentConfirmedEvent);

    // Wait for RabbitMQ consumer -> BullMQ enqueue -> Worker -> publish
    await new Promise((resolve) => setTimeout(resolve, 35000));

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const event = receivedEvents.find(
      (e) => e.eventType === 'order.ready' && (e.data as any).orderId === 'order-456',
    );
    expect(event).toBeDefined();
    expect((event!.data as any).orderId).toBe('order-456');
    expect((event!.data as any).kitchenTicketId).toBeDefined();
  }, 40000);
});
