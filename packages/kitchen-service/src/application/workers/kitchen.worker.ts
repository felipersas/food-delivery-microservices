import { Worker, type Job } from 'bullmq';
import type { RabbitMQConnection } from '@app/messaging';
import type { DomainEvent } from '@app/shared';
import type { KitchenTicketRepository } from '../../domain/repositories/kitchen-ticket.repository.interface';
import type { KitchenJobData } from '../processors/kitchen.processor';
import { KitchenProcessor } from '../processors/kitchen.processor';

export interface EventPublisher {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

export class KitchenWorkerService {
  private worker: Worker<KitchenJobData>;
  private processor = new KitchenProcessor();

  constructor(
    redisOpts: { host: string; port: number },
    queueName: string,
    private readonly rabbitConnection: RabbitMQConnection,
    private readonly ticketRepository?: KitchenTicketRepository,
  ) {}

  private async processJob(job: Job<KitchenJobData>): Promise<void> {
    await job.updateProgress(10);

    const { ticket } = await this.processor.process(job.data);

    await job.updateProgress(50);

    if (this.ticketRepository) {
      await this.ticketRepository.save(ticket);
    }

    await job.updateProgress(100);

    // Publish domain events through EventPublisher (not directly!)
    const events = ticket.getDomainEvents();
    await this.rabbitConnection.publish('order.ready', events[0]);
    ticket.clearDomainEvents();
  }

  getWorker(): Worker<KitchenJobData> {
    return this.worker;
  }
}
