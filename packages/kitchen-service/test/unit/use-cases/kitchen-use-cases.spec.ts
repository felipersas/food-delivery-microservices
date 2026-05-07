import { describe, it, expect, beforeEach } from 'bun:test';
import { CreateKitchenTicketUseCase } from '@application/use-cases/create-kitchen-ticket/create-kitchen-ticket.use-case';
import { GetKitchenTicketUseCase } from '@application/use-cases/get-kitchen-ticket/get-kitchen-ticket.use-case';
import { UpdateKitchenTicketStatusUseCase } from '@application/use-cases/update-kitchen-ticket-status/update-kitchen-ticket-status.use-case';
import { ListKitchenTicketsUseCase } from '@application/use-cases/list-kitchen-tickets/list-kitchen-tickets.use-case';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import { KitchenTicketStatus } from '@domain/aggregates/kitchen-ticket.aggregate';
import { InvalidStateException, type DomainEvent } from '@app/shared';
import type { KitchenTicketRepository } from '@domain/repositories/kitchen-ticket.repository.interface';

// Mock implementations
class MockKitchenTicketRepository implements KitchenTicketRepository {
  private tickets = new Map<string, KitchenTicket>();

  async save(ticket: KitchenTicket): Promise<void> {
    this.tickets.set(ticket.getId(), ticket);
  }

  async findById(id: string): Promise<KitchenTicket | null> {
    return this.tickets.get(id) || null;
  }

  async findByRestaurantId(restaurantId: string): Promise<KitchenTicket[]> {
    return Array.from(this.tickets.values()).filter(
      (t) => t.getRestaurantId() === restaurantId,
    );
  }

  async delete(id: string): Promise<void> {
    this.tickets.delete(id);
  }

  // Helper for tests
  clear(): void {
    this.tickets.clear();
  }
}

class MockEventPublisher implements EventPublisher {
  publishedEvents: DomainEvent[] = [];

  async publishAll(events: readonly DomainEvent[]): Promise<void> {
    this.publishedEvents.push(...events);
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

describe('Kitchen Service Use Cases Unit Tests', () => {
  let repo: MockKitchenTicketRepository;
  let publisher: MockEventPublisher;
  let createUseCase: CreateKitchenTicketUseCase;
  let getUseCase: GetKitchenTicketUseCase;
  let updateStatusUseCase: UpdateKitchenTicketStatusUseCase;
  let listUseCase: ListKitchenTicketsUseCase;

  beforeEach(() => {
    repo = new MockKitchenTicketRepository();
    publisher = new MockEventPublisher();
    createUseCase = new CreateKitchenTicketUseCase(repo, publisher);
    getUseCase = new GetKitchenTicketUseCase(repo);
    updateStatusUseCase = new UpdateKitchenTicketStatusUseCase(repo, publisher);
    listUseCase = new ListKitchenTicketsUseCase(repo);
  });

  describe('CreateKitchenTicketUseCase', () => {
    it('should create a new kitchen ticket', async () => {
      const result = await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          {
            productId: 'product-1',
            productName: 'X-Burger',
            quantity: 2,
          },
        ],
      });

      expect(result.ticketId).toBeDefined();
      expect(result.orderId).toBe('order-123');
      expect(result.status).toBe(KitchenTicketStatus.WAITING);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('product-1');
      expect(result.items[0].quantity).toBe(2);
    });

    it('should save ticket to repository', async () => {
      const result = await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      const saved = await repo.findById(result.ticketId);
      expect(saved).not.toBeNull();
      expect(saved!.getOrderId()).toBe('order-123');
      expect(saved!.getStatus()).toBe(KitchenTicketStatus.WAITING);
    });

    it('should not publish events on creation (events only on ready)', async () => {
      await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      // No events on creation
      expect(publisher.publishedEvents.length).toBe(0);
    });
  });

  describe('GetKitchenTicketUseCase', () => {
    it('should return ticket by id', async () => {
      const created = await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      const result = await getUseCase.execute(created.ticketId);

      expect(result).not.toBeNull();
      expect(result!.ticketId).toBe(created.ticketId);
      expect(result!.orderId).toBe('order-123');
      expect(result!.status).toBe(KitchenTicketStatus.WAITING);
    });

    it('should return null for non-existent ticket', async () => {
      const result = await getUseCase.execute('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('UpdateKitchenTicketStatusUseCase', () => {
    it('should update ticket status to PREPARING', async () => {
      const created = await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      const result = await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.PREPARING,
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe(KitchenTicketStatus.PREPARING);
    });

    it('should update ticket status to READY', async () => {
      const created = await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.PREPARING,
      );
      const result = await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.READY,
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe(KitchenTicketStatus.READY);
    });

    it('should return null for non-existent ticket', async () => {
      const result = await updateStatusUseCase.execute(
        'non-existent-id',
        KitchenTicketStatus.PREPARING,
      );
      expect(result).toBeNull();
    });

    it('should throw error when transitioning to WAITING', async () => {
      const created = await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.PREPARING,
      );

      await expect(async () => {
        await updateStatusUseCase.execute(
          created.ticketId,
          KitchenTicketStatus.WAITING,
        );
      }).toThrow(InvalidStateException);
      await expect(async () => {
        await updateStatusUseCase.execute(
          created.ticketId,
          KitchenTicketStatus.WAITING,
        );
      }).toThrow('Cannot transition back to WAITING status');
    });

    it('should publish order.ready event when marked ready', async () => {
      const created = await createUseCase.execute({
        orderId: 'order-123',
        restaurantId: 'restaurant-456',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      publisher.clear();

      await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.PREPARING,
      );

      // No events on preparing
      expect(publisher.publishedEvents.length).toBe(0);

      await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.READY,
      );

      // order.ready event emitted on ready
      expect(publisher.publishedEvents.length).toBeGreaterThan(0);
      const readyEvent = publisher.publishedEvents.find(
        (e: any) => e.eventType === 'order.ready',
      );
      expect(readyEvent).toBeDefined();
      expect(readyEvent!.data.orderId).toBe('order-123');
    });
  });

  describe('ListKitchenTicketsUseCase', () => {
    beforeEach(async () => {
      // Create test data
      await createUseCase.execute({
        orderId: 'order-1',
        restaurantId: 'restaurant-123',
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      await createUseCase.execute({
        orderId: 'order-2',
        restaurantId: 'restaurant-123',
        items: [
          { productId: 'product-2', productName: 'X-Fries', quantity: 2 },
        ],
      });

      const ticket3 = await createUseCase.execute({
        orderId: 'order-3',
        restaurantId: 'restaurant-123',
        items: [{ productId: 'product-3', productName: 'X-Soda', quantity: 1 }],
      });

      await updateStatusUseCase.execute(
        ticket3.ticketId,
        KitchenTicketStatus.PREPARING,
      );
    });

    it('should list all tickets for a restaurant', async () => {
      const result = await listUseCase.execute({
        restaurantId: 'restaurant-123',
      });

      expect(result).toHaveLength(3);
    });

    it('should filter tickets by status', async () => {
      const waitingResult = await listUseCase.execute({
        restaurantId: 'restaurant-123',
        status: KitchenTicketStatus.WAITING,
      });

      expect(waitingResult).toHaveLength(2);

      const preparingResult = await listUseCase.execute({
        restaurantId: 'restaurant-123',
        status: KitchenTicketStatus.PREPARING,
      });

      expect(preparingResult).toHaveLength(1);
    });

    it('should return empty array for restaurant with no tickets', async () => {
      const result = await listUseCase.execute({
        restaurantId: 'no-tickets-restaurant',
      });
      expect(result).toHaveLength(0);
    });

    it('should include ticket metadata', async () => {
      const result = await listUseCase.execute({
        restaurantId: 'restaurant-123',
      });

      expect(result.length).toBeGreaterThan(0);
      const ticket = result[0];
      expect(ticket.ticketId).toBeDefined();
      expect(ticket.orderId).toBeDefined();
      expect(ticket.restaurantId).toBe('restaurant-123');
      expect(ticket.status).toBeDefined();
      expect(ticket.items).toBeInstanceOf(Array);
      expect(ticket.createdAt).toBeDefined();
      expect(ticket.updatedAt).toBeDefined();
    });
  });
});
