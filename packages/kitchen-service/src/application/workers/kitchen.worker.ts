import { Worker, type Job } from 'bullmq';
import type { RabbitMQConnection } from '@app/messaging';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import type { KitchenJobData } from '@application/processors/kitchen.processor';
import { KitchenProcessor } from '@application/processors/kitchen.processor';

export class KitchenWorkerService {
  private worker: Worker<KitchenJobData>;
  private processor = new KitchenProcessor();

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
    await job.updateProgress(10);

    const { ticket, readyEvent } = this.processor.process(job.data);

    await job.updateProgress(50);

    if (this.ticketRepository) {
      await this.ticketRepository.save(ticket);
    }

    await job.updateProgress(100);

    await this.rabbitConnection.publish('order.ready', readyEvent);
  }

  getWorker(): Worker<KitchenJobData> {
    return this.worker;
  }
}
