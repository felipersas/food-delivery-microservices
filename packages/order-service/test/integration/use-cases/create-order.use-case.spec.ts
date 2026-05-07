import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity } from '../../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../../src/infra/database/typeorm/entities/order-item.entity';
import { CreateOrderUseCase } from '../../../src/application/use-cases/create-order/create-order.use-case';
import { ORDER_REPOSITORY, EVENT_PUBLISHER, RABBITMQ_CONNECTION } from '../../../src/tokens';
import { RabbitMQEventPublisher } from '../../../src/infra/messaging/rabbitmq/order-event.publisher';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresOrderRepository } from '../../../src/infra/database/typeorm/repositories/order.repository.impl';

describe('CreateOrderUseCase Integration Tests (Docker Compose)', () => {
  let connections: Record<string, string>;
  let module: TestingModule;
  let useCase: CreateOrderUseCase;
  let repo: PostgresOrderRepository;
  let publisher: RabbitMQEventPublisher;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-order', 'rabbitmq'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');

    // Create test module ONCE for all tests
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connections.orderDatabase,
          entities: [OrderEntity, OrderItemEntity],
          synchronize: true,
          dropSchema: false,
        }),
      ],
      providers: [
        {
          provide: RABBITMQ_CONNECTION,
          useFactory: () => new RabbitMQConnection({
            url: connections.rabbitmqUrl,
            exchange: 'food-ordering',
          }),
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
          inject: [RABBITMQ_CONNECTION],
        },
        {
          provide: ORDER_REPOSITORY,
          useFactory: (dataSource: DataSource) => new PostgresOrderRepository(dataSource),
          inject: [DataSource],
        },
        CreateOrderUseCase,
      ],
    }).compile();

    useCase = module.get<CreateOrderUseCase>(CreateOrderUseCase);
    repo = module.get<PostgresOrderRepository>(ORDER_REPOSITORY);
    publisher = module.get<RabbitMQEventPublisher>(EVENT_PUBLISHER);
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    if (module) await module.close();
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  it('should create order and publish domain event', async () => {
    // Mock event publisher to capture events
    const publishedEvents: any[] = [];
    const originalPublishAll = publisher.publishAll.bind(publisher);
    publisher.publishAll = async (events) => {
      publishedEvents.push(...events);
      return originalPublishAll(events);
    };

    const result = await useCase.execute({
      customerId: uuidv4(),
      restaurantId: uuidv4(),
      items: [
        {
          productId: 'product-1',
          productName: 'X-Burger',
          quantity: 2,
          unitPrice: 50,
        },
      ],
    });

    // Verify order was created
    expect(result.orderId).toBeDefined();
    expect(result.status).toBe('PENDING');
    expect(result.totalAmount).toBe(100);

    // Verify domain event was published
    expect(publishedEvents.length).toBeGreaterThan(0);
    const orderEvent = publishedEvents.find((e) => e.eventType === 'order.created');
    expect(orderEvent).toBeDefined();
    expect(orderEvent.data).toHaveProperty('orderId', result.orderId);
  });
});
