import type { Job } from 'bullmq';

export interface KitchenJobData {
  orderId: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}

export class KitchenProcessor {
  async process(job: Job<KitchenJobData>): Promise<void> {
    const { orderId, items } = job.data;

    console.log(`[Kitchen] Processing order ${orderId} with ${items.length} items`);

    // Simulate preparation time
    await job.updateProgress(50);

    // In real app: update ticket status, publish OrderReady event
    console.log(`[Kitchen] Order ${orderId} ready!`);
  }
}
