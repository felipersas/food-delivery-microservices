import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { Worker } from 'bullmq';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { KitchenQueue } from '@infra/queue/kitchen.queue';
import { KitchenWorkerService } from '@application/workers/kitchen.worker';
import { ProcessKitchenTicketUseCase } from '@application/use-cases/process-kitchen-ticket/process-kitchen-ticket.use-case';
import { RabbitMQEventPublisher } from '@infra/messaging/rabbitmq/kitchen-event.publisher';
import { InMemoryKitchenTicketRepository } from '@infra/database/memory/kitchen-ticket.repository';

const REDIS_URL = { host: 'localhost', port: 6379 };
const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const QUEUE_NAME = 'kitchen-jobs-test';

describe('Kitchen BullMQ Worker (Integration)', () => {
  let kitchenQueue: KitchenQueue;
  let rabbitConnection: RabbitMQConnection;
  let testConnection: RabbitMQConnection;
  let receivedEvents: DomainEvent[];
  let worker: Worker;

  beforeAll(async () => {
    receivedEvents = [];

    kitchenQueue = new KitchenQueue(REDIS_URL, QUEUE_NAME);
    rabbitConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    testConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Create ProcessKitchenTicketUseCase with dependencies
    const ticketRepo = new InMemoryKitchenTicketRepository();
    const eventPublisher = new RabbitMQEventPublisher(rabbitConnection);
    const processTicketUseCase = new ProcessKitchenTicketUseCase(ticketRepo, eventPublisher);

    // Start worker that processes BullMQ jobs and publishes events
    worker = new KitchenWorkerService(REDIS_URL, QUEUE_NAME, processTicketUseCase).getWorker();

    // Subscribe to order.ready events
    await testConnection.subscribe(`test-bullmq-events-${Date.now()}`, ['order.ready'], async (event) => {
      receivedEvents.push(event);
    });

    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await worker.close();
    await kitchenQueue.close();
    await rabbitConnection.close();
    await testConnection.close();
  });

  it('should process kitchen job via BullMQ and publish order.ready', async () => {
    await kitchenQueue.addJob({
      orderId: 'order-789',
      restaurantId: 'restaurant-1',
      items: [
        { productId: 'p-1', productName: 'Burger', quantity: 2 },
        { productId: 'p-2', productName: 'Fries', quantity: 1 },
      ],
    });

    // Wait for BullMQ worker to process and publish (max 30s delay + buffer)
    await new Promise((resolve) => setTimeout(resolve, 35000));

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const event = receivedEvents.find((e) => e.eventType === 'order.ready');
    expect(event).toBeDefined();
    expect((event!.data as any).orderId).toBe('order-789');
    expect((event!.data as any).kitchenTicketId).toBeDefined();
  }, 40000);
});
