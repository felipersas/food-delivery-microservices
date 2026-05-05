import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { Customer } from '@domain/aggregates/customer.aggregate';
import { InMemoryCustomerRepository } from '@infra/database/memory/customer.repository';
import { RabbitMQEventPublisher } from '@infra/messaging/rabbitmq/customer-event.publisher';

const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const QUEUE = `test-customer-events-${Date.now()}`;

describe('Customer Event Publishing (Integration)', () => {
  let connection: RabbitMQConnection;
  let testConnection: RabbitMQConnection;
  let receivedEvents: DomainEvent[];

  beforeAll(async () => {
    receivedEvents = [];

    // Connection for the publisher (customer-service)
    connection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Separate connection for the test subscriber
    testConnection = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });

    // Subscribe before publishing
    await testConnection.subscribe(QUEUE, ['customer.#'], async (event) => {
      receivedEvents.push(event);
    });

    // Give RabbitMQ a moment to set up bindings
    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await connection.close();
    await testConnection.close();
  });

  it('should publish customer.created event', async () => {
    const repo = new InMemoryCustomerRepository();
    const publisher = new RabbitMQEventPublisher(connection);

    const customer = Customer.create({
      name: 'Event Test User',
      email: 'event-test@example.com',
      phone: '+5511999999999',
    });

    const events = customer.getDomainEvents();
    await publisher.publishAll(events);
    customer.clearDomainEvents();

    // Wait for message delivery
    await new Promise((resolve) => setTimeout(resolve, 1000));

    expect(receivedEvents.length).toBeGreaterThanOrEqual(1);
    const event = receivedEvents.find((e) => e.eventType === 'customer.created');
    expect(event).toBeDefined();
    expect((event!.data as any).name).toBe('Event Test User');
  });

  it('should publish customer.updated event', async () => {
    const repo = new InMemoryCustomerRepository();
    const publisher = new RabbitMQEventPublisher(connection);

    const customer = Customer.create({
      name: 'Update Test User',
      email: 'update-test@example.com',
      phone: '+5511888888888',
    });
    customer.clearDomainEvents();

    customer.updateProfile({ name: 'Updated Name' });

    const events = customer.getDomainEvents();
    await publisher.publishAll(events);
    customer.clearDomainEvents();

    // Wait for message delivery
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const event = receivedEvents.find((e) => e.eventType === 'customer.updated');
    expect(event).toBeDefined();
    expect((event!.data as any).name).toBe('Updated Name');
  });

  it('should publish customer.address.added event', async () => {
    const repo = new InMemoryCustomerRepository();
    const publisher = new RabbitMQEventPublisher(connection);

    const customer = Customer.create({
      name: 'Address Test User',
      email: 'address-test@example.com',
      phone: '+5511777777777',
    });
    customer.clearDomainEvents();

    customer.addAddress({
      street: 'Rua Test',
      number: '123',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01234-567',
    });

    const events = customer.getDomainEvents();
    await publisher.publishAll(events);
    customer.clearDomainEvents();

    // Wait for message delivery
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const addressEvent = receivedEvents.find((e) => e.eventType === 'customer.address.added');
    expect(addressEvent).toBeDefined();
  });

  it('should publish customer.payment-method.added event', async () => {
    const repo = new InMemoryCustomerRepository();
    const publisher = new RabbitMQEventPublisher(connection);

    const customer = Customer.create({
      name: 'Payment Test User',
      email: 'payment-event@example.com',
      phone: '+5511666666666',
    });
    customer.clearDomainEvents();

    customer.savePaymentMethod({
      token: '1234',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2026,
    });

    const events = customer.getDomainEvents();
    await publisher.publishAll(events);
    customer.clearDomainEvents();

    // Wait for message delivery
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pmEvent = receivedEvents.find((e) => e.eventType === 'customer.payment-method.added');
    expect(pmEvent).toBeDefined();
    expect((pmEvent!.data as any).brand).toBe('visa');
  });
});
