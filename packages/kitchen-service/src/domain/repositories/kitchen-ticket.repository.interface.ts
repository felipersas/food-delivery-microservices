import type { Repository } from '@app/shared';
import type { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';

export interface KitchenTicketRepository extends Repository<KitchenTicket> {
  findByRestaurantId(restaurantId: string): Promise<KitchenTicket[]>;
}
