import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KitchenTicketEntity } from '../../../src/infra/database/typeorm/entities/kitchen-ticket.entity';
import { KitchenTicketItemEntity } from '../../../src/infra/database/typeorm/entities/kitchen-ticket-item.entity';
import { PostgresKitchenTicketRepository } from '../../../src/infra/database/typeorm/repositories/kitchen-ticket.repository.impl';
import { KitchenTicket } from '../../../src/domain/aggregates/kitchen-ticket.aggregate';
import { KitchenTicketStatus } from '../../../src/domain/aggregates/kitchen-ticket.aggregate';

describe('PostgresKitchenTicketRepository Integration Tests', () => {
  let connections: Record<string, string>;
  let module: TestingModule;
  let repo: PostgresKitchenTicketRepository;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-kitchen'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');

    // Create test module ONCE for all tests
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connections.kitchenDatabase,
          entities: [KitchenTicketEntity, KitchenTicketItemEntity],
          synchronize: true,
          dropSchema: false,
        }),
      ],
      providers: [
        {
          provide: PostgresKitchenTicketRepository,
          useFactory: (dataSource: DataSource) => new PostgresKitchenTicketRepository(dataSource),
          inject: [DataSource],
        },
      ],
    }).compile();

    repo = module.get<PostgresKitchenTicketRepository>(PostgresKitchenTicketRepository);
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    if (module) await module.close();
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  const createTestTicket = (ticketId?: string) => {
    const id = ticketId || uuidv4();
    return KitchenTicket.createFromOrder({
      orderId: uuidv4(),
      restaurantId: uuidv4(),
      items: [
        {
          productId: 'product-1',
          productName: 'X-Burger',
          quantity: 2,
        },
      ],
    });
  };

  it('should save a new kitchen ticket', async () => {
    const ticket = createTestTicket();
    await repo.save(ticket);

    const found = await repo.findById(ticket.getId());
    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(ticket.getId());
    expect(found!.getOrderId()).toBe(ticket.getOrderId());
  });

  it('should save ticket with items', async () => {
    const ticket = createTestTicket();
    await repo.save(ticket);

    const found = await repo.findById(ticket.getId());
    expect(found).not.toBeNull();
    expect(found!.getItems().length).toBe(1);
    expect(found!.getItems()[0].productId).toBe('product-1');
    expect(found!.getItems()[0].quantity).toBe(2);
  });

  it('should find ticket by id', async () => {
    const ticket = createTestTicket();
    await repo.save(ticket);
    const found = await repo.findById(ticket.getId());

    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(ticket.getId());
    expect(found!.getStatus()).toBe(KitchenTicketStatus.WAITING);
  });

  it('should return null for non-existent ticket', async () => {
    const nonExistentId = uuidv4();
    const found = await repo.findById(nonExistentId);

    expect(found).toBeNull();
  });

  it('should update ticket status', async () => {
    const ticket = createTestTicket();
    await repo.save(ticket);

    ticket.startPreparing();
    await repo.save(ticket);

    const found = await repo.findById(ticket.getId());
    expect(found!.getStatus()).toBe(KitchenTicketStatus.PREPARING);
  });

  it('should mark ticket as ready and emit domain event', async () => {
    const ticket = createTestTicket();
    ticket.startPreparing();
    await repo.save(ticket);

    ticket.markReady();
    await repo.save(ticket);

    const found = await repo.findById(ticket.getId());
    expect(found!.getStatus()).toBe(KitchenTicketStatus.READY);

    // Verify domain event was emitted
    const events = ticket.getDomainEvents();
    const readyEvent = events.find((e) => e.eventType === 'order.ready');
    expect(readyEvent).toBeDefined();
    expect(readyEvent!.data.orderId).toBe(ticket.getOrderId());
  });

  it('should find tickets by restaurant id', async () => {
    const restaurantId = uuidv4();

    const ticket1 = KitchenTicket.createFromOrder({
      orderId: uuidv4(),
      restaurantId,
      items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 1 }],
    });
    await repo.save(ticket1);

    const ticket2 = KitchenTicket.createFromOrder({
      orderId: uuidv4(),
      restaurantId,
      items: [{ productId: 'product-2', productName: 'X-Fries', quantity: 2 }],
    });
    await repo.save(ticket2);

    const found = await repo.findByRestaurantId(restaurantId);
    expect(found.length).toBe(2);
    expect(found.map((t) => t.getId())).toContain(ticket1.getId());
  });

  it('should delete ticket', async () => {
    const ticket = createTestTicket();
    await repo.save(ticket);

    await repo.delete(ticket.getId());

    const found = await repo.findById(ticket.getId());
    expect(found).toBeNull();
  });
});
