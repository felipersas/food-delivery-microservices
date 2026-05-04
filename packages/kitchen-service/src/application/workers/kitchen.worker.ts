import { Worker, type Job } from 'bullmq';
import type { RabbitMQConnection } from '@app/messaging';
import type { DomainEvent } from '@app/shared';
import type { KitchenJobData } from '@infra/queue/kitchen.queue';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import { v4 as uuidv4 } from 'uuid';

export class KitchenWorkerService {
  private worker: Worker<KitchenJobData>;

  constructor(
    redisOpts: { host: string; port: number },
    queueName: string,
    private readonly rabbitConnection: RabbitMQConnection,
    private readonly ticketRepository?: KitchenTicketRepository,
  ) {
    this.worker = new Worker<KitchenJobData>(
      queueName,
      async (job: Job<KitchenJobData>) => {
        await this.processJob(job);
      },
      { connection: redisOpts, concurrency: 5 },
    );
  }

  private async processJob(job: Job<KitchenJobData>): Promise<void> {
    const { orderId, items } = job.data;

    await job.updateProgress(10);

    const ticket = KitchenTicket.createFromOrder({ orderId, items });

    await job.updateProgress(30);
    ticket.startPreparing();

    if (this.ticketRepository) {
      await this.ticketRepository.save(ticket);
    }

    // Simulate preparation time
    await new Promise((resolve) => setTimeout(resolve, 500));

    await job.updateProgress(80);
    ticket.markReady();

    if (this.ticketRepository) {
      await this.ticketRepository.save(ticket);
    }

    await job.updateProgress(100);

    const readyEvent: DomainEvent = {
      eventId: uuidv4(),
      eventType: 'order.ready',
      occurredAt: new Date().toISOString(),
      aggregateId: ticket.getId(),
      aggregateType: 'KitchenTicket',
      data: {
        orderId,
        kitchenTicketId: ticket.getId(),
        readyAt: new Date().toISOString(),
      },
    };

    await this.rabbitConnection.publish('order.ready', readyEvent);
  }

  getWorker(): Worker<KitchenJobData> {
    return this.worker;
  }
}
