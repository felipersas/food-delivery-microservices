import { Injectable, Inject } from '@nestjs/common';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import type {
  CreateKitchenTicketInput,
  CreateKitchenTicketOutput,
} from '@application/dto/create-kitchen-ticket.dto';
import { EVENT_PUBLISHER } from '../../../tokens';
import type { EventPublisher } from '@app/shared';

@Injectable()
export class CreateKitchenTicketUseCase {
  constructor(
    private readonly kitchenTicketRepository: KitchenTicketRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    input: CreateKitchenTicketInput,
  ): Promise<CreateKitchenTicketOutput> {
    const ticket = KitchenTicket.createFromOrder({
      orderId: input.orderId,
      items: input.items,
      restaurantId: input.restaurantId,
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
