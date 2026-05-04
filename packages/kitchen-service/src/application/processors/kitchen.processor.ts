import type { DomainEvent } from '@app/shared';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import { v4 as uuidv4 } from 'uuid';

export interface KitchenJobData {
  orderId: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}

export interface KitchenProcessingResult {
  ticket: KitchenTicket;
  readyEvent: DomainEvent;
}

export class KitchenProcessor {
  process(data: KitchenJobData): KitchenProcessingResult {
    const ticket = KitchenTicket.createFromOrder({
      orderId: data.orderId,
      items: data.items,
    });

    ticket.startPreparing();
    ticket.markReady();

    const readyEvent: DomainEvent = {
      eventId: uuidv4(),
      eventType: 'order.ready',
      occurredAt: new Date().toISOString(),
      aggregateId: ticket.getId(),
      aggregateType: 'KitchenTicket',
      data: {
        orderId: data.orderId,
        kitchenTicketId: ticket.getId(),
        readyAt: new Date().toISOString(),
      },
    };

    return { ticket, readyEvent };
  }
}
