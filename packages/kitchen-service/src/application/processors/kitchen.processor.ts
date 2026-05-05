import type { DomainEvent } from '@app/shared';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import { v4 as uuidv4 } from 'uuid';

export interface KitchenJobData {
  orderId: string;
  restaurantId: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}

export interface KitchenProcessingResult {
  ticket: KitchenTicket;
}

export class KitchenProcessor {
  async process(data: KitchenJobData): Promise<KitchenProcessingResult> {
    const ticket = KitchenTicket.createFromOrder({
      orderId: data.orderId,
      items: data.items,
    });

    ticket.startPreparing();

    // Random delay 1-30 seconds to simulate food preparation
    const delaySeconds = Math.floor(Math.random() * 29) + 1;
    await this.sleep(delaySeconds * 1000);

    ticket.markReady();

    return { ticket };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
