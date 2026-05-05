import { Queue } from 'bullmq';

export interface KitchenJobData {
  orderId: string;
  restaurantId: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}

export class KitchenQueue {
  private queue: Queue<KitchenJobData>;

  constructor(
    redisOpts: { host: string; port: number },
    queueName: string = 'kitchen-jobs',
  ) {
    this.queue = new Queue<KitchenJobData>(queueName, { connection: redisOpts });
  }

  async addJob(data: KitchenJobData): Promise<string> {
    const job = await this.queue.add('prepare-order', data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 1000 },
    });
    return job.id ?? '';
  }

  async close(): Promise<void> {
    await this.queue.close();
  }
}
