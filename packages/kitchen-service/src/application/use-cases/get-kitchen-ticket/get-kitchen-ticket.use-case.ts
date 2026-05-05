import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import type { GetKitchenTicketOutput } from '@application/dto/get-kitchen-ticket.dto';

export class GetKitchenTicketUseCase {
  constructor(
    private readonly kitchenTicketRepository: KitchenTicketRepository,
  ) {}

  async execute(ticketId: string): Promise<GetKitchenTicketOutput | null> {
    const ticket = await this.kitchenTicketRepository.findById(ticketId);
    if (!ticket) return null;

    return {
      ticketId: ticket.getId(),
      orderId: ticket.getOrderId(),
      status: ticket.getStatus(),
      items: ticket.getItems(),
    };
  }
}
