import { describe, it, expect } from 'bun:test';
import { KitchenTicket, KitchenTicketStatus } from '@domain/aggregates/kitchen-ticket.aggregate';

describe('KitchenTicket Aggregate', () => {
  it('should create with WAITING status', () => {
    const ticket = KitchenTicket.createFromOrder({
      orderId: 'order-1',
      items: [{ productId: 'p-1', productName: 'Burger', quantity: 2 }],
    });

    expect(ticket.getStatus()).toBe(KitchenTicketStatus.WAITING);
    expect(ticket.getOrderId()).toBe('order-1');
  });

  it('should transition WAITING → PREPARING → READY', () => {
    const ticket = KitchenTicket.createFromOrder({
      orderId: 'order-1',
      items: [{ productId: 'p-1', productName: 'Burger', quantity: 1 }],
    });

    ticket.startPreparing();
    expect(ticket.getStatus()).toBe(KitchenTicketStatus.PREPARING);

    ticket.markReady();
    expect(ticket.getStatus()).toBe(KitchenTicketStatus.READY);
  });

  it('should NOT skip PREPARING step', () => {
    const ticket = KitchenTicket.createFromOrder({
      orderId: 'order-1',
      items: [{ productId: 'p-1', productName: 'Burger', quantity: 1 }],
    });

    expect(() => ticket.markReady()).toThrow();
  });
});
