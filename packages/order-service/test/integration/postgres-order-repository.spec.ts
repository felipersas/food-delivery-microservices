import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { DataSource } from 'typeorm';
import { Money } from '@app/shared';
import { PostgresOrderRepository } from '../../src/infra/database/typeorm/repositories/order.repository.impl';
import { Order } from '../../src/domain/aggregates/order.aggregate';
import { OrderItem } from '../../src/domain/value-objects/order-item.vo';
import { OrderEntity } from '../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../src/infra/database/typeorm/entities/order-item.entity';

const DB_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/orders';

describe('PostgresOrderRepository (Integration)', () => {
  let dataSource: DataSource;
  let repository: PostgresOrderRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [OrderEntity, OrderItemEntity],
      synchronize: true, // auto-create tables for tests
    });
    await dataSource.initialize();
    repository = new PostgresOrderRepository(dataSource);
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should save and retrieve an order', async () => {
    const items = [
      new OrderItem({
        productId: 'p-1',
        productName: 'X-Burger',
        quantity: 2,
        unitPrice: Money.BRL(25),
      }),
    ];

    const order = Order.create({
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items,
    });

    // Clear events so we test persistence, not events
    order.clearDomainEvents();

    await repository.save(order);

    const found = await repository.findById(order.getId());

    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(order.getId());
    expect(found!.getCustomerId()).toBe('customer-1');
    expect(found!.getStatus()).toBe('PENDING');
    expect(found!.getTotalAmount().amount).toBe(50);
    expect(found!.getItems()).toHaveLength(1);
    expect(found!.getItems()[0].productName).toBe('X-Burger');
  });

  it('should persist status changes', async () => {
    const order = Order.create({
      customerId: 'customer-2',
      restaurantId: 'restaurant-1',
      items: [new OrderItem({
        productId: 'p-2',
        productName: 'Fries',
        quantity: 1,
        unitPrice: Money.BRL(15),
      })],
    });
    order.clearDomainEvents();

    await repository.save(order);

    order.confirm();
    order.clearDomainEvents();
    await repository.save(order);

    const found = await repository.findById(order.getId());
    expect(found!.getStatus()).toBe('CONFIRMED');
  });

  it('should delete an order', async () => {
    const order = Order.create({
      customerId: 'customer-3',
      restaurantId: 'restaurant-1',
      items: [new OrderItem({
        productId: 'p-3',
        productName: 'Soda',
        quantity: 3,
        unitPrice: Money.BRL(5),
      })],
    });
    order.clearDomainEvents();

    await repository.save(order);
    await repository.delete(order.getId());

    const found = await repository.findById(order.getId());
    expect(found).toBeNull();
  });

  it('should return null for non-existent order', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });
});
