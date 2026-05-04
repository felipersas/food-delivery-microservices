import type { Repository } from '@app/shared';
import type { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';

export type KitchenTicketRepository = Repository<KitchenTicket>;
