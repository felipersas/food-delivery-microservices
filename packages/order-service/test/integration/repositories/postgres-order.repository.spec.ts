import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity } from '../../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../../src/infra/database/typeorm/entities/order-item.entity';
import { PostgresOrderRepository } from '../../../src/infra/database/typeorm/repositories/order.repository.impl';
import { Order } from '../../../src/domain/aggregates/order.aggregate';
import { OrderStatusEnum } from '../../../src/domain/value-objects/order-status.vo';
import { OrderItem } from '../../../src/domain/value-objects/order-item.vo';
import { Money } from '@app/shared';

describe('PostgresOrderRepository Integration Tests (Docker Compose)', () => {
  let connections: Record<string, string>;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-order'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');
    console.log('[beforeAll] Order DB URL:', connections.orderDatabase);
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  const createTestingModule = async () => {
    return Test.createTestingModule({
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
          provide: PostgresOrderRepository,
          useFactory: (dataSource: DataSource) => new PostgresOrderRepository(dataSource),
          inject: [DataSource],
        },
      ],
    }).compile();
  };

  const createTestOrder = (orderId?: string) => {
    const id = orderId || uuidv4();
    const items = [
      OrderItem.create({
        productId: 'product-1',
        productName: 'X-Burger',
        quantity: 2,
        unitPrice: Money.BRL(2500),
      }),
    ];

    return Order.reconstitute({
      id,
      customerId: uuidv4(),
      restaurantId: uuidv4(),
      status: OrderStatusEnum.PENDING,
      items,
      totalAmount: Money.BRL(5000),
      version: 1,
      paymentMethodIndex: 0,
      paymentMethodType: 'CREDIT_CARD',
    });
  };

  it('should save a new order', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

    const order = createTestOrder();
    await repo.save(order);

    // Verify by querying back through repository
    const found = await repo.findById(order.getId());
    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(order.getId());
    expect(found!.getCustomerId()).toBe(order.getCustomerId());

    await module.close();
  }, { timeout: 30000 });

  it('should save order with items', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

    const order = createTestOrder();
    await repo.save(order);

    // Verify items were saved
    const found = await repo.findById(order.getId());
    expect(found).not.toBeNull();
    expect(found!.getItems().length).toBe(1);
    expect(found!.getItems()[0].productId).toBe('product-1');

    await module.close();
  }, { timeout: 30000 });

  it('should find order by id', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

    const order = createTestOrder();
    await repo.save(order);
    const found = await repo.findById(order.getId());

    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(order.getId());
    expect(found!.getCustomerId()).toBe(order.getCustomerId());
    expect(found!.getStatus()).toBe(OrderStatusEnum.PENDING);

    await module.close();
  }, { timeout: 30000 });

  it('should return null for non-existent order', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

    const nonExistentId = uuidv4();
    const found = await repo.findById(nonExistentId);

    expect(found).toBeNull();

    await module.close();
  }, { timeout: 30000 });

  it('should update order status', async () => {
    const module = await createTestingModule();
    const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

    const order = createTestOrder();
    await repo.save(order);

    order.confirm();
    await repo.save(order);

    const found = await repo.findById(order.getId());

    expect(found!.getStatus()).toBe(OrderStatusEnum.CONFIRMED);

    await module.close();
  }, { timeout: 30000 });
});
