import { Inject, Injectable } from '@nestjs/common';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';
import type {
  ListKitchenTicketsInput,
  ListKitchenTicketsOutput,
} from '../../dto/list-kitchen-tickets.dto';
import { KITCHEN_TICKET_REPOSITORY } from '../../../tokens';

@Injectable()
export class ListKitchenTicketsUseCase {
  constructor(
    @Inject(KITCHEN_TICKET_REPOSITORY)
    private readonly kitchenTicketRepository: KitchenTicketRepository,
  ) {}

  async execute(
    input: ListKitchenTicketsInput,
  ): Promise<ListKitchenTicketsOutput> {
    const tickets = await this.kitchenTicketRepository.findByRestaurantId(
      input.restaurantId ?? '',
    );

    return tickets
      .filter((ticket) => {
        if (input.status) {
          return ticket.getStatus() === input.status;
        }
        return true;
      })
      .map((ticket) => ({
        ticketId: ticket.getId(),
        orderId: ticket.getOrderId(),
        restaurantId: ticket.getRestaurantId(),
        status: ticket.getStatus(),
        items: ticket.getItems().map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
        })),
        createdAt: ticket.getCreatedAt(),
        updatedAt: ticket.getUpdatedAt(),
      }));
  }
}
