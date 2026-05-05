import { Worker, type Job } from 'bullmq';
import type { ProcessKitchenTicketUseCase } from '../use-cases/process-kitchen-ticket/process-kitchen-ticket.use-case';
import type { KitchenJobData } from '@application/dto/kitchen-job.dto';

export class KitchenWorkerService {
  private worker: Worker<KitchenJobData>;

  constructor(
    redisOpts: { host: string; port: number },
    queueName: string,
    private readonly processTicketUseCase: ProcessKitchenTicketUseCase,
  ) {
    this.worker = new Worker<KitchenJobData>(
      queueName,
      (job: Job<KitchenJobData>) => this.processJob(job),
      { connection: { host: redisOpts.host, port: redisOpts.port } },
    );
  }

  private async processJob(job: Job<KitchenJobData>): Promise<void> {
    await job.updateProgress(10);

    await this.processTicketUseCase.execute(job.data);

    await job.updateProgress(100);
  }

  getWorker(): Worker<KitchenJobData> {
    return this.worker;
  }

  async close(): Promise<void> {
    await this.worker.close();
  }
}
