import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { PostgresTestContainer, clearDatabase } from '@app/test-utils';
import { TestModuleBuilder } from '@app/test-utils';
import { OrderEntity } from '../../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../../src/infra/database/typeorm/entities/order-item.entity';
import { PostgresOrderRepository } from '../../../src/infra/database/typeorm/repositories/order.repository.impl';
import { Order, OrderStatus, Money } from '@app/shared';

describe('PostgresOrderRepository Integration Tests', () => {
  const moduleBuilder = new TestModuleBuilder();

  beforeAll(async () => {
    await PostgresTestContainer.start();
  });

  afterAll(async () => {
    await PostgresTestContainer.stop();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  describe('save', () => {
    it('should save a new order', async () => {
      const module = await TestModuleBuilder.buildForRepositories({
        entities: [OrderEntity, OrderItemEntity],
        providers: [PostgresOrderRepository],
      });

      const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

      const order = Order.reconstitute({
        id: 'order-1',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: OrderStatus.PENDING,
        items: [],
        totalAmount: Money.BRL(5000),
        version: 1,
      });

      await repo.save(order);

      const client = await PostgresTestContainer.getClient();
      const result = await client.query('SELECT * FROM orders WHERE id = $1', ['order-1']);

      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].id).toBe('order-1');
      expect(result.rows[0].customer_id).toBe('customer-1');
      expect(result.rows[0].status).toBe('PENDING');
      expect(result.rows[0].total_amount_cents).toBe(5000);
    });

    it('should save order with items', async () => {
      const module = await TestModuleBuilder.buildForRepositories({
        entities: [OrderEntity, OrderItemEntity],
        providers: [PostgresOrderRepository],
      });

      const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

      const order = Order.reconstitute({
        id: 'order-1',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: OrderStatus.PENDING,
        items: [
          {
            id: 'item-1',
            productId: 'product-1',
            productName: 'X-Burger',
            quantity: 2,
            unitPrice: Money.BRL(2500),
            totalPrice: Money.BRL(5000),
          },
        ],
        totalAmount: Money.BRL(5000),
        version: 1,
      });

      await repo.save(order);

      const client = await PostgresTestContainer.getClient();
      const itemsResult = await client.query('SELECT * FROM order_items WHERE order_id = $1', ['order-1']);

      expect(itemsResult.rows).toHaveLength(1);
      expect(itemsResult.rows[0].product_id).toBe('product-1');
      expect(itemsResult.rows[0].product_name).toBe('X-Burger');
      expect(itemsResult.rows[0].quantity).toBe(2);
      expect(itemsResult.rows[0].unit_price_cents).toBe(2500);
    });
  });

  describe('findById', () => {
    it('should find order by id', async () => {
      const module = await TestModuleBuilder.buildForRepositories({
        entities: [OrderEntity, OrderItemEntity],
        providers: [PostgresOrderRepository],
      });

      const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

      const order = Order.reconstitute({
        id: 'order-1',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: OrderStatus.PENDING,
        items: [],
        totalAmount: Money.BRL(5000),
        version: 1,
      });

      await repo.save(order);
      const found = await repo.findById('order-1');

      expect(found).not.toBeNull();
      expect(found!.getId()).toBe('order-1');
      expect(found!.getCustomerId()).toBe('customer-1');
      expect(found!.getStatus()).toBe(OrderStatus.PENDING);
    });

    it('should return null for non-existent order', async () => {
      const module = await TestModuleBuilder.buildForRepositories({
        entities: [OrderEntity, OrderItemEntity],
        providers: [PostgresOrderRepository],
      });

      const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

      const found = await repo.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('update', () => {
    it('should update order status', async () => {
      const module = await TestModuleBuilder.buildForRepositories({
        entities: [OrderEntity, OrderItemEntity],
        providers: [PostgresOrderRepository],
      });

      const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

      const order = Order.reconstitute({
        id: 'order-1',
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        status: OrderStatus.PENDING,
        items: [],
        totalAmount: Money.BRL(5000),
        version: 1,
      });

      await repo.save(order);

      order.confirm();
      await repo.save(order);

      const found = await repo.findById('order-1');

      expect(found!.getStatus()).toBe(OrderStatus.CONFIRMED);
    });
  });
});
