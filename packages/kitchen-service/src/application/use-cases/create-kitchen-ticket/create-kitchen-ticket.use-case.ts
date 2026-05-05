import type { DomainEvent } from '@app/shared';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import type {
  CreateKitchenTicketInput,
  CreateKitchenTicketOutput,
} from '@application/dto/create-kitchen-ticket.dto';

export interface EventPublisher {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

export class CreateKitchenTicketUseCase {
  constructor(
    private readonly kitchenTicketRepository: KitchenTicketRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    input: CreateKitchenTicketInput,
  ): Promise<CreateKitchenTicketOutput> {
    const ticket = KitchenTicket.createFromOrder({
      orderId: input.orderId,
      items: input.items,
    });

    await this.kitchenTicketRepository.save(ticket);

    const events = ticket.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    ticket.clearDomainEvents();

    return {
      ticketId: ticket.getId(),
      orderId: ticket.getOrderId(),
      status: ticket.getStatus(),
      items: ticket.getItems(),
    };
  }
}
