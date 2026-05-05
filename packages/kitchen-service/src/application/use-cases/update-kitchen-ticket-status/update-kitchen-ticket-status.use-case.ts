import { InvalidStateException } from '@app/shared';
import { KitchenTicketStatus } from '@domain/aggregates/kitchen-ticket.aggregate';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import type { UpdateKitchenTicketOutput } from '@application/dto/update-kitchen-ticket.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/kitchen-event.publisher';

export class UpdateKitchenTicketStatusUseCase {
  constructor(
    private readonly kitchenTicketRepository: KitchenTicketRepository,
    private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    ticketId: string,
    status: KitchenTicketStatus,
  ): Promise<UpdateKitchenTicketOutput | null> {
    const ticket = await this.kitchenTicketRepository.findById(ticketId);
    if (!ticket) return null;

    switch (status) {
      case KitchenTicketStatus.PREPARING:
        ticket.startPreparing();
        break;
      case KitchenTicketStatus.READY:
        ticket.markReady();
        break;
      case KitchenTicketStatus.WAITING:
        throw new InvalidStateException(
          'Cannot transition back to WAITING status',
        );
    }

    await this.kitchenTicketRepository.save(ticket);

    const events = ticket.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    ticket.clearDomainEvents();

    return {
      ticketId: ticket.getId(),
      orderId: ticket.getOrderId(),
      status: ticket.getStatus(),
    };
  }
}
