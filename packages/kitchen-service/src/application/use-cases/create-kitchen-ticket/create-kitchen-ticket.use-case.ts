import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import type {
  CreateKitchenTicketInput,
  CreateKitchenTicketOutput,
} from '@application/dto/create-kitchen-ticket.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/kitchen-event.publisher';
import { EVENT_PUBLISHER } from '../../../tokens';

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
