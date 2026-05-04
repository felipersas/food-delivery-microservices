import type { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';

export class InMemoryKitchenTicketRepository
  implements KitchenTicketRepository
{
  private tickets: Map<string, KitchenTicket> = new Map();

  async findById(id: string): Promise<KitchenTicket | null> {
    return this.tickets.get(id) ?? null;
  }

  async save(aggregate: KitchenTicket): Promise<void> {
    this.tickets.set(aggregate.getId(), aggregate);
  }

  async delete(id: string): Promise<void> {
    this.tickets.delete(id);
  }
}
