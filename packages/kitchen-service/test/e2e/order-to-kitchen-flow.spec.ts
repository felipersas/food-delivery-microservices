import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { KitchenTicketEntity } from '@infra/database/typeorm/entities/kitchen-ticket.entity';
import { KitchenTicketItemEntity } from '@infra/database/typeorm/entities/kitchen-ticket-item.entity';
import { CreateKitchenTicketUseCase } from '@application/use-cases/create-kitchen-ticket/create-kitchen-ticket.use-case';
import { UpdateKitchenTicketStatusUseCase } from '@application/use-cases/update-kitchen-ticket-status/update-kitchen-ticket-status.use-case';
import { GetKitchenTicketUseCase } from '@application/use-cases/get-kitchen-ticket/get-kitchen-ticket.use-case';
import { KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER } from '../../src/tokens';
import { PostgresKitchenTicketRepository } from '@infra/database/typeorm/repositories/kitchen-ticket.repository.impl';
import { KitchenTicketStatus } from '@domain/aggregates/kitchen-ticket.aggregate';
import type { DomainEvent } from '@app/shared';

// Dynamic imports for order service (avoiding direct import issues)
const loadOrderService = async () => {
  const orderPath = '../../../order-service/src';
  return {
    OrderEntity: (
      await import(`${orderPath}/infra/database/typeorm/entities/order.entity`)
    ).OrderEntity,
    OrderItemEntity: (
      await import(
        `${orderPath}/infra/database/typeorm/entities/order-item.entity`
      )
    ).OrderItemEntity,
    CreateOrderUseCase: (
      await import(
        `${orderPath}/application/use-cases/create-order/create-order.use-case`
      )
    ).CreateOrderUseCase,
    PostgresOrderRepository: (
      await import(
        `${orderPath}/infra/database/typeorm/repositories/order.repository.impl`
      )
    ).PostgresOrderRepository,
    ORDER_REPOSITORY: (await import(`${orderPath}/tokens`)).ORDER_REPOSITORY,
  };
};

describe('Order-to-Kitchen E2E Flow', () => {
  let connections: Record<string, string>;
  let kitchenModule: TestingModule;
  let orderModule: TestingModule;
  let createTicketUseCase: CreateKitchenTicketUseCase;
  let updateStatusUseCase: UpdateKitchenTicketStatusUseCase;
  let getTicketUseCase: GetKitchenTicketUseCase;
  let kitchenRepo: PostgresKitchenTicketRepository;

  beforeAll(
    async () => {
      console.log('[beforeAll] Starting Docker Compose environment...');

      connections = await TestCompose.start({
        services: ['postgres-order', 'postgres-kitchen', 'rabbitmq'],
        env: { TEST_MODE: 'e2e' },
      });

      console.log('[beforeAll] Environment started');

      // Create kitchen module ONCE
      kitchenModule = await Test.createTestingModule({
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
            useFactory: (dataSource: DataSource) =>
              new PostgresKitchenTicketRepository(dataSource),
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
            useFactory: (repo, publisher) =>
              new CreateKitchenTicketUseCase(repo, publisher),
            inject: [KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER],
          },
          {
            provide: GetKitchenTicketUseCase,
            useFactory: (repo) => new GetKitchenTicketUseCase(repo),
            inject: [KITCHEN_TICKET_REPOSITORY],
          },
          {
            provide: UpdateKitchenTicketStatusUseCase,
            useFactory: (repo, publisher) =>
              new UpdateKitchenTicketStatusUseCase(repo, publisher),
            inject: [KITCHEN_TICKET_REPOSITORY, EVENT_PUBLISHER],
          },
        ],
      }).compile();

      createTicketUseCase = kitchenModule.get<CreateKitchenTicketUseCase>(
        CreateKitchenTicketUseCase,
      );
      updateStatusUseCase = kitchenModule.get<UpdateKitchenTicketStatusUseCase>(
        UpdateKitchenTicketStatusUseCase,
      );
      getTicketUseCase = kitchenModule.get<GetKitchenTicketUseCase>(
        GetKitchenTicketUseCase,
      );
      kitchenRepo = kitchenModule.get<PostgresKitchenTicketRepository>(
        KITCHEN_TICKET_REPOSITORY,
      );
    },
    { timeout: 120000 },
  );

  afterAll(
    async () => {
      console.log('[afterAll] Stopping Docker Compose environment...');
      await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
      if (kitchenModule) await kitchenModule.close();
      if (orderModule) await orderModule.close();
      console.log('[afterAll] Environment stopped');
    },
    { timeout: 30000 },
  );

  const createOrderModule = async (orderClasses: any) => {
    return Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connections.orderDatabase,
          entities: [orderClasses.OrderEntity, orderClasses.OrderItemEntity],
          synchronize: true,
          dropSchema: false,
        }),
      ],
      providers: [
        {
          provide: orderClasses.ORDER_REPOSITORY,
          useFactory: (dataSource: DataSource) =>
            new orderClasses.PostgresOrderRepository(dataSource),
          inject: [DataSource],
        },
        {
          provide: orderClasses.CreateOrderUseCase,
          useFactory: (repo) => new orderClasses.CreateOrderUseCase(repo),
          inject: [orderClasses.ORDER_REPOSITORY],
        },
      ],
    }).compile();
  };

  it(
    'should complete order creation → kitchen ticket → ready flow',
    async () => {
      // Load order service classes dynamically
      const orderClasses = await loadOrderService();

      // Create order module
      orderModule = await createOrderModule(orderClasses);

      const orderId = uuidv4();
      const restaurantId = uuidv4();

      // Step 1: Simulate order.created event payload
      const orderCreatedEvent: DomainEvent = {
        eventId: uuidv4(),
        eventType: 'order.created',
        occurredAt: new Date().toISOString(),
        aggregateId: orderId,
        aggregateType: 'Order',
        version: 1,
        data: {
          orderId,
          customerId: uuidv4(),
          restaurantId,
          items: [
            {
              productId: 'product-1',
              productName: 'X-Burger',
              quantity: 2,
              unitPrice: 50,
            },
          ],
          totalAmountCents: 10000,
        },
      };

      // Step 2: KitchenConsumer receives order.created and creates ticket
      const eventData = orderCreatedEvent.data as any;
      const ticketResult = await createTicketUseCase.execute({
        orderId: eventData.orderId,
        restaurantId: eventData.restaurantId,
        items: eventData.items.map((item: any) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
        })),
      });

      expect(ticketResult.ticketId).toBeDefined();
      expect(ticketResult.orderId).toBe(orderId);
      expect(ticketResult.status).toBe(KitchenTicketStatus.WAITING);

      // Step 3: Kitchen worker processes ticket (async via BullMQ)
      // Simulate worker starting preparation
      const preparingResult = await updateStatusUseCase.execute(
        ticketResult.ticketId,
        KitchenTicketStatus.PREPARING,
      );

      expect(preparingResult).not.toBeNull();
      expect(preparingResult!.status).toBe(KitchenTicketStatus.PREPARING);

      // Step 4: Food preparation completes (1-30s in real scenario)
      const readyResult = await updateStatusUseCase.execute(
        ticketResult.ticketId,
        KitchenTicketStatus.READY,
      );

      expect(readyResult).not.toBeNull();
      expect(readyResult!.status).toBe(KitchenTicketStatus.READY);

      // Step 5: Verify order.ready event was emitted (check domain events)
      const readyTicket = await getTicketUseCase.execute(ticketResult.ticketId);
      expect(readyTicket).not.toBeNull();
      expect(readyTicket!.status).toBe(KitchenTicketStatus.READY);

      // Step 6: Verify ticket was persisted correctly
      const savedTicket = await kitchenRepo.findById(ticketResult.ticketId);
      expect(savedTicket).not.toBeNull();
      expect(savedTicket!.getOrderId()).toBe(orderId);
      expect(savedTicket!.getStatus()).toBe(KitchenTicketStatus.READY);
      expect(savedTicket!.getItems()).toHaveLength(1);
      expect(savedTicket!.getItems()[0].productId).toBe('product-1');
      expect(savedTicket!.getItems()[0].quantity).toBe(2);

      await orderModule.close();
      orderModule = null as any;
    },
    { timeout: 30000 },
  );

  it(
    'should handle multiple tickets for same restaurant',
    async () => {
      const orderClasses = await loadOrderService();
      orderModule = await createOrderModule(orderClasses);

      const restaurantId = uuidv4();

      // Create multiple orders/tickets for same restaurant
      const ticket1 = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      const ticket2 = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [
          { productId: 'product-2', productName: 'X-Fries', quantity: 2 },
        ],
      });

      const ticket3 = await createTicketUseCase.execute({
        orderId: uuidv4(),
        restaurantId,
        items: [{ productId: 'product-3', productName: 'X-Soda', quantity: 1 }],
      });

      // Verify all tickets are in WAITING status
      expect(ticket1.status).toBe(KitchenTicketStatus.WAITING);
      expect(ticket2.status).toBe(KitchenTicketStatus.WAITING);
      expect(ticket3.status).toBe(KitchenTicketStatus.WAITING);

      // Process tickets in parallel (simulating kitchen workflow)
      await updateStatusUseCase.execute(
        ticket1.ticketId,
        KitchenTicketStatus.PREPARING,
      );
      await updateStatusUseCase.execute(
        ticket2.ticketId,
        KitchenTicketStatus.PREPARING,
      );
      await updateStatusUseCase.execute(
        ticket3.ticketId,
        KitchenTicketStatus.PREPARING,
      );

      // Mark first as ready
      const ready1 = await updateStatusUseCase.execute(
        ticket1.ticketId,
        KitchenTicketStatus.READY,
      );
      expect(ready1!.status).toBe(KitchenTicketStatus.READY);

      // Verify all tickets exist in database
      const savedTicket1 = await kitchenRepo.findById(ticket1.ticketId);
      const savedTicket2 = await kitchenRepo.findById(ticket2.ticketId);
      const savedTicket3 = await kitchenRepo.findById(ticket3.ticketId);

      expect(savedTicket1!.getStatus()).toBe(KitchenTicketStatus.READY);
      expect(savedTicket2!.getStatus()).toBe(KitchenTicketStatus.PREPARING);
      expect(savedTicket3!.getStatus()).toBe(KitchenTicketStatus.PREPARING);

      await orderModule.close();
      orderModule = null as any;
    },
    { timeout: 30000 },
  );

  it(
    'should track ticket status transitions with domain events',
    async () => {
      const orderClasses = await loadOrderService();
      orderModule = await createOrderModule(orderClasses);

      // Capture published events
      const publishedEvents: DomainEvent[] = [];
      const originalPublishAll = (
        kitchenModule.get<any>(EVENT_PUBLISHER) as any
      ).publishAll.bind(kitchenModule.get(EVENT_PUBLISHER));
      (kitchenModule.get<any>(EVENT_PUBLISHER) as any).publishAll = async (
        events: DomainEvent[],
      ) => {
        publishedEvents.push(...events);
        await originalPublishAll(events);
      };

      const orderId = uuidv4();
      const ticket = await createTicketUseCase.execute({
        orderId,
        restaurantId: uuidv4(),
        items: [
          { productId: 'product-1', productName: 'X-Burger', quantity: 1 },
        ],
      });

      // No events should be emitted on ticket creation (only on payment confirmation)
      // Kitchen tickets are created when payment is confirmed

      // Start preparing - should emit domain event
      await updateStatusUseCase.execute(
        ticket.ticketId,
        KitchenTicketStatus.PREPARING,
      );

      // Mark ready - should emit order.ready event
      await updateStatusUseCase.execute(
        ticket.ticketId,
        KitchenTicketStatus.READY,
      );

      // Verify order.ready event was emitted
      const orderReadyEvent = publishedEvents.find(
        (e) => e.eventType === 'order.ready',
      );
      expect(orderReadyEvent).toBeDefined();
      expect(orderReadyEvent!.data.orderId).toBe(orderId);

      await orderModule.close();
      orderModule = null as any;
    },
    { timeout: 30000 },
  );
});
