import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KitchenTicketEntity } from '../../../src/infra/database/typeorm/entities/kitchen-ticket.entity';
import { KitchenTicketItemEntity } from '../../../src/infra/database/typeorm/entities/kitchen-ticket-item.entity';
import { CreateKitchenTicketUseCase } from '../../../src/application/use-cases/create-kitchen-ticket/create-kitchen-ticket.use-case';
import { GetKitchenTicketUseCase } from '../../../src/application/use-cases/get-kitchen-ticket/get-kitchen-ticket.use-case';
import { UpdateKitchenTicketStatusUseCase } from '../../../src/application/use-cases/update-kitchen-ticket-status/update-kitchen-ticket-status.use-case';
import { ListKitchenTicketsUseCase } from '../../../src/application/use-cases/list-kitchen-tickets/list-kitchen-tickets.use-case';
import {
  KITCHEN_TICKET_REPOSITORY,
  EVENT_PUBLISHER,
} from '../../../src/tokens';
import { PostgresKitchenTicketRepository } from '../../../src/infra/database/typeorm/repositories/kitchen-ticket.repository.impl';
import { KitchenTicketStatus } from '../../../src/domain/aggregates/kitchen-ticket.aggregate';

describe('Kitchen Service Use Cases Integration Tests', () => {
  let connections: Record<string, string>;
  let module: TestingModule;
  let createTicketUseCase: CreateKitchenTicketUseCase;
  let getTicketUseCase: GetKitchenTicketUseCase;
  let updateStatusUseCase: UpdateKitchenTicketStatusUseCase;
  let listTicketsUseCase: ListKitchenTicketsUseCase;
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
          provide: KITCHEN_TICKET_REPOSITORY,
          useFactory: (dataSource: DataSource) => new PostgresKitchenTicketRepository(dataSource),
          inject: [DataSource],
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: () => ({
            publishAll: async () => {},
          }),
        },
        {
          provide: CreateKitchenTicketUseCase,
          useFactory: (repo, publisher) => new CreateKitchenTicketUseCase(repo, publisher),
          inject: [KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER],
        },
        {
          provide: GetKitchenTicketUseCase,
          useFactory: (repo) => new GetKitchenTicketUseCase(repo),
          inject: [KITCHEN_TICKET_REPOSITORY],
        },
        {
          provide: UpdateKitchenTicketStatusUseCase,
          useFactory: (repo, publisher) => new UpdateKitchenTicketStatusUseCase(repo, publisher),
          inject: [KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER],
        },
        {
          provide: ListKitchenTicketsUseCase,
          useFactory: (repo) => new ListKitchenTicketsUseCase(repo),
          inject: [KITCHEN_TICKET_REPOSITORY],
        },
      ],
    }).compile();

    createTicketUseCase = module.get<CreateKitchenTicketUseCase>(CreateKitchenTicketUseCase);
    getTicketUseCase = module.get<GetKitchenTicketUseCase>(GetKitchenTicketUseCase);
    updateStatusUseCase = module.get<UpdateKitchenTicketStatusUseCase>(UpdateKitchenTicketStatusUseCase);
    listTicketsUseCase = module.get<ListKitchenTicketsUseCase>(ListKitchenTicketsUseCase);
    repo = module.get<PostgresKitchenTicketRepository>(KITCHEN_TICKET_REPOSITORY);
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    if (module) await module.close();
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  describe('CreateKitchenTicketUseCase', () => {
    it('should create a new kitchen ticket', async () => {
      const result = await createTicketUseCase.execute({
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

      expect(result.ticketId).toBeDefined();
      expect(result.orderId).toBeDefined();
      expect(result.status).toBe(KitchenTicketStatus.WAITING);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].productId).toBe('product-1');
      expect(result.items[0].quantity).toBe(2);
    });

    it('should persist ticket to database', async () => {
      const orderId = uuidv4();
      const result = await createTicketUseCase.execute({
        orderId,
        restaurantId: uuidv4(),
        items: [{ productId: 'product-1', productName: 'X-Fries', quantity: 1 }],
      });

      const saved = await repo.findById(result.ticketId);
      expect(saved).not.toBeNull();
      expect(saved!.getOrderId()).toBe(orderId);
      expect(saved!.getStatus()).toBe(KitchenTicketStatus.WAITING);
    });
  });

  describe('GetKitchenTicketUseCase', () => {
    it('should return ticket by id', async () => {
      const created = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId: uuidv4(),
        items: [{ productId: 'product-1', productName: 'X-Soda', quantity: 1 }],
      });

      const result = await getTicketUseCase.execute(created.ticketId);

      expect(result).not.toBeNull();
      expect(result!.ticketId).toBe(created.ticketId);
      expect(result!.orderId).toBe(created.orderId);
      expect(result!.status).toBe(KitchenTicketStatus.WAITING);
    });

    it('should return null for non-existent ticket', async () => {
      const result = await getTicketUseCase.execute(uuidv4());
      expect(result).toBeNull();
    });
  });

  describe('UpdateKitchenTicketStatusUseCase', () => {
    it('should update ticket status to PREPARING', async () => {
      const created = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId: uuidv4(),
        items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 1 }],
      });

      const result = await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.PREPARING,
      );

      expect(result).not.toBeNull();
      expect(result!.status).toBe(KitchenTicketStatus.PREPARING);

      const saved = await repo.findById(created.ticketId);
      expect(saved!.getStatus()).toBe(KitchenTicketStatus.PREPARING);
    });

    it('should update ticket status to READY', async () => {
      const created = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId: uuidv4(),
        items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 1 }],
      });

      await updateStatusUseCase.execute(created.ticketId, KitchenTicketStatus.PREPARING);
      const result = await updateStatusUseCase.execute(created.ticketId, KitchenTicketStatus.READY);

      expect(result).not.toBeNull();
      expect(result!.status).toBe(KitchenTicketStatus.READY);

      const saved = await repo.findById(created.ticketId);
      expect(saved!.getStatus()).toBe(KitchenTicketStatus.READY);
    });

    it('should return null for non-existent ticket', async () => {
      const result = await updateStatusUseCase.execute(
        uuidv4(),
        KitchenTicketStatus.PREPARING,
      );
      expect(result).toBeNull();
    });

    it('should throw error when transitioning to WAITING', async () => {
      const created = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId: uuidv4(),
        items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 1 }],
      });

      await updateStatusUseCase.execute(created.ticketId, KitchenTicketStatus.PREPARING);

      await expect(async () => {
        await updateStatusUseCase.execute(created.ticketId, KitchenTicketStatus.WAITING);
      }).toThrow('Cannot transition back to WAITING status');
    });
  });

  describe('ListKitchenTicketsUseCase', () => {
    it('should list all tickets for a restaurant', async () => {
      const restaurantId = uuidv4();

      await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 1 }],
      });

      await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [{ productId: 'product-2', productName: 'X-Fries', quantity: 2 }],
      });

      const result = await listTicketsUseCase.execute({ restaurantId });

      expect(result).toHaveLength(2);
    });

    it('should filter tickets by status', async () => {
      const restaurantId = uuidv4();

      const ticket1 = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 1 }],
      });

      const ticket2 = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [{ productId: 'product-2', productName: 'X-Fries', quantity: 2 }],
      });

      await updateStatusUseCase.execute(ticket1.ticketId, KitchenTicketStatus.PREPARING);

      const waitingResult = await listTicketsUseCase.execute({
        restaurantId,
        status: KitchenTicketStatus.WAITING,
      });

      expect(waitingResult).toHaveLength(1);
      expect(waitingResult[0].ticketId).toBe(ticket2.ticketId);

      const preparingResult = await listTicketsUseCase.execute({
        restaurantId,
        status: KitchenTicketStatus.PREPARING,
      });

      expect(preparingResult).toHaveLength(1);
      expect(preparingResult[0].ticketId).toBe(ticket1.ticketId);
    });

    it('should return empty array for restaurant with no tickets', async () => {
      const result = await listTicketsUseCase.execute({ restaurantId: uuidv4() });
      expect(result).toHaveLength(0);
    });

    it('should include ticket metadata', async () => {
      const restaurantId = uuidv4();
      const created = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 2 }],
      });

      const result = await listTicketsUseCase.execute({ restaurantId });

      expect(result).toHaveLength(1);
      const ticket = result[0];
      expect(ticket.ticketId).toBe(created.ticketId);
      expect(ticket.orderId).toBeDefined();
      expect(ticket.restaurantId).toBe(restaurantId);
      expect(ticket.status).toBe(KitchenTicketStatus.WAITING);
      expect(ticket.items).toHaveLength(1);
      expect(ticket.items[0].productId).toBe('product-1');
      expect(ticket.items[0].productName).toBe('X-Burger');
      expect(ticket.items[0].quantity).toBe(2);
      expect(ticket.createdAt).toBeDefined();
      expect(ticket.updatedAt).toBeDefined();
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete full ticket lifecycle', async () => {
      const orderId = uuidv4();
      const restaurantId = uuidv4();

      // Create ticket
      const created = await createTicketUseCase.execute({
        orderId,
        restaurantId,
        items: [{ productId: 'product-1', productName: 'X-Burger', quantity: 1 }],
      });

      expect(created.status).toBe(KitchenTicketStatus.WAITING);

      // Get ticket
      const fetched = await getTicketUseCase.execute(created.ticketId);
      expect(fetched).not.toBeNull();
      expect(fetched!.orderId).toBe(orderId);

      // Start preparing
      const preparing = await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.PREPARING,
      );
      expect(preparing!.status).toBe(KitchenTicketStatus.PREPARING);

      // Mark ready
      const ready = await updateStatusUseCase.execute(
        created.ticketId,
        KitchenTicketStatus.READY,
      );
      expect(ready!.status).toBe(KitchenTicketStatus.READY);

      // List tickets for restaurant
      const listed = await listTicketsUseCase.execute({ restaurantId });
      expect(listed).toHaveLength(1);
      expect(listed[0].status).toBe(KitchenTicketStatus.READY);
    });
  });
});
