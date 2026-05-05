import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { DataSource } from 'typeorm';
import { Customer } from '@domain/aggregates/customer.aggregate';
import { CustomerEntity } from '@infra/database/typeorm/entities/customer.entity';
import { PostgresCustomerRepository } from '@infra/database/typeorm/repositories/customer.repository.impl';
import { RabbitMQConnection } from '@app/messaging';
import { CustomerConsumer } from '@infra/messaging/rabbitmq/customer.consumer';

const DB_URL = process.env.CUSTOMER_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5436/customers';
const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const QUEUE = `test-customer-consumer-${Date.now()}`;

describe('Customer Event Consuming (Integration)', () => {
  let dataSource: DataSource;
  let repository: PostgresCustomerRepository;
  let rabbitMQ: RabbitMQConnection;
  let consumer: CustomerConsumer;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [CustomerEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    await dataSource.createQueryRunner().clearTable('customers');

    repository = new PostgresCustomerRepository(dataSource);

    rabbitMQ = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    consumer = new CustomerConsumer(rabbitMQ, repository);
    await consumer.start();
  });

  afterAll(async () => {
    await consumer.stop();
    await rabbitMQ.close();
    await dataSource.destroy();
  });

  it('should update customer statistics on order.completed event', async () => {
    // Create a customer
    const customer = Customer.create({
      name: 'Order Stats User',
      email: 'order-stats@example.com',
      phone: '+5511999999999',
    });
    customer.clearDomainEvents();
    await repository.save(customer);

    const customerId = customer.getId();
    const initialOrders = customer.getTotalOrders();
    const initialSpent = customer.getTotalSpent();

    // Publish order.completed event
    const orderCompletedEvent = {
      eventId: `event-${Date.now()}`,
      eventType: 'order.completed',
      occurredAt: new Date().toISOString(),
      aggregateId: 'order-123',
      aggregateType: 'Order',
      data: {
        orderId: 'order-123',
        customerId: customerId,
        totalAmount: 150,
      },
    };

    await rabbitMQ.publish('order.completed', orderCompletedEvent);

    // Wait for consumer to process (with delay for DB commit)
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify customer statistics were updated
    const updated = await repository.findById(customerId);
    expect(updated).not.toBeNull();
    expect(updated!.getTotalOrders()).toBe(initialOrders + 1);
    expect(updated!.getTotalSpent()).toBe(initialSpent + 150);
  });

  it('should process multiple order.completed events', async () => {
    // Create a customer
    const customer = Customer.create({
      name: 'Multi Order User',
      email: 'multi-order@example.com',
      phone: '+5511888888888',
    });
    customer.clearDomainEvents();
    await repository.save(customer);

    const customerId = customer.getId();

    // Publish multiple order.completed events
    const events = [
      {
        eventId: `event-1-${Date.now()}`,
        eventType: 'order.completed',
        occurredAt: new Date().toISOString(),
        aggregateId: 'order-1',
        aggregateType: 'Order',
        data: { orderId: 'order-1', customerId, totalAmount: 50 },
      },
      {
        eventId: `event-2-${Date.now()}`,
        eventType: 'order.completed',
        occurredAt: new Date().toISOString(),
        aggregateId: 'order-2',
        aggregateType: 'Order',
        data: { orderId: 'order-2', customerId, totalAmount: 75 },
      },
      {
        eventId: `event-3-${Date.now()}`,
        eventType: 'order.completed',
        occurredAt: new Date().toISOString(),
        aggregateId: 'order-3',
        aggregateType: 'Order',
        data: { orderId: 'order-3', customerId, totalAmount: 100 },
      },
    ];

    for (const event of events) {
      await rabbitMQ.publish('order.completed', event);
    }

    // Wait for consumer to process all events
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Verify customer statistics were updated
    const updated = await repository.findById(customerId);
    expect(updated).not.toBeNull();
    expect(updated!.getTotalOrders()).toBe(3);
    expect(updated!.getTotalSpent()).toBe(225); // 50 + 75 + 100
  });

  it('should ignore events for non-existent customers', async () => {
    const nonExistentCustomerId = '00000000-0000-0000-0000-000000000001';

    const event = {
      eventId: `event-ignore-${Date.now()}`,
      eventType: 'order.completed',
      occurredAt: new Date().toISOString(),
      aggregateId: 'order-ignore',
      aggregateType: 'Order',
      data: {
        orderId: 'order-ignore',
        customerId: nonExistentCustomerId,
        totalAmount: 999,
      },
    };

    // Should not throw
    await rabbitMQ.publish('order.completed', event);

    // Wait a bit for any processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Verify no customer was created
    const found = await repository.findById(nonExistentCustomerId);
    expect(found).toBeNull();
  });
});
