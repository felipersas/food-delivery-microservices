import { Injectable } from "@nestjs/common";
import { type DomainEvent } from '@app/shared';
import type { KitchenTicketRepository } from '../../../domain/repositories/kitchen-ticket.repository.interface';
import { KitchenTicket } from '../../../domain/aggregates/kitchen-ticket.aggregate';
import { KitchenTicketStatus } from '../../../domain/aggregates/kitchen-ticket.aggregate';

export interface KitchenJobData {
  orderId: string;
  restaurantId: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}

export interface EventPublisher {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

/**
 * Use case for async processing of kitchen tickets via BullMQ worker
 *
 * Flow:
 * 1. Creates ticket from order data
 * 2. Starts preparing (status change)
 * 3. Simulates food preparation delay (1-30s)
 * 4. Marks as ready (emits order.ready event)
 * 5. Persists and publishes domain events
 */
@Injectable()
export class ProcessKitchenTicketUseCase {
  constructor(
    private readonly kitchenTicketRepository: KitchenTicketRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(data: KitchenJobData): Promise<{ ticketId: string; orderId: string }> {
    // 1. Create ticket from order
    const ticket = KitchenTicket.createFromOrder({
      orderId: data.orderId,
      items: data.items,
    });

    // 2. Start preparing
    ticket.startPreparing();
    await this.kitchenTicketRepository.save(ticket);

    // 3. Simulate food preparation (async delay 1-30 seconds)
    const delaySeconds = Math.floor(Math.random() * 29) + 1;
    await this.sleep(delaySeconds * 1000);

    // 4. Mark as ready (emits order.ready event)
    ticket.markReady();
    await this.kitchenTicketRepository.save(ticket);

    // 5. Publish domain events (order.ready)
    const events = ticket.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    ticket.clearDomainEvents();

    return {
      ticketId: ticket.getId(),
      orderId: ticket.getOrderId(),
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
