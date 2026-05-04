import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { KitchenTicket } from '@domain/aggregates/kitchen-ticket.aggregate';
import { KitchenTicketStatus } from '@domain/aggregates/kitchen-ticket.aggregate';
import { PostgresKitchenTicketRepository } from '@infra/database/typeorm/repositories/kitchen-ticket.repository.impl';
import { KitchenTicketEntity } from '@infra/database/typeorm/entities/kitchen-ticket.entity';
import { KitchenTicketItemEntity } from '@infra/database/typeorm/entities/kitchen-ticket-item.entity';
import { DataSource } from 'typeorm';

const DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5434/kitchen';

describe('PostgresKitchenTicketRepository (Integration)', () => {
  let dataSource: DataSource;
  let repository: PostgresKitchenTicketRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [KitchenTicketEntity, KitchenTicketItemEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new PostgresKitchenTicketRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should save and retrieve a kitchen ticket', async () => {
    const ticket = KitchenTicket.createFromOrder({
      orderId: 'order-1',
      items: [
        { productId: 'p-1', productName: 'Burger', quantity: 2 },
        { productId: 'p-2', productName: 'Fries', quantity: 1 },
      ],
    });

    ticket.clearDomainEvents();
    await repository.save(ticket);

    const found = await repository.findById(ticket.getId());

    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(ticket.getId());
    expect(found!.getOrderId()).toBe('order-1');
    expect(found!.getStatus()).toBe(KitchenTicketStatus.WAITING);
    expect(found!.getItems()).toHaveLength(2);
    expect(found!.getItems()[0].productName).toBe('Burger');
  });

  it('should persist status transitions', async () => {
    const ticket = KitchenTicket.createFromOrder({
      orderId: 'order-2',
      items: [{ productId: 'p-1', productName: 'Soda', quantity: 3 }],
    });
    ticket.clearDomainEvents();

    await repository.save(ticket);

    ticket.startPreparing();
    ticket.clearDomainEvents();
    await repository.save(ticket);

    const found = await repository.findById(ticket.getId());
    expect(found!.getStatus()).toBe(KitchenTicketStatus.PREPARING);
    expect(found!.getVersion()).toBe(1);
  });

  it('should delete a ticket', async () => {
    const ticket = KitchenTicket.createFromOrder({
      orderId: 'order-3',
      items: [{ productId: 'p-1', productName: 'Salad', quantity: 1 }],
    });
    ticket.clearDomainEvents();

    await repository.save(ticket);
    await repository.delete(ticket.getId());

    const found = await repository.findById(ticket.getId());
    expect(found).toBeNull();
  });

  it('should return null for non-existent ticket', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });
});
