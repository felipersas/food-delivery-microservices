import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { DataSource } from 'typeorm';
import type { DomainEvent } from '@app/shared';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresCustomerRepository } from '@infra/database/typeorm/repositories/customer.repository.impl';
import { RabbitMQEventPublisher } from '@infra/messaging/rabbitmq/customer-event.publisher';
import { CreateCustomerUseCase } from '@application/use-cases/create-customer/create-customer.use-case';
import { GetCustomerUseCase } from '@application/use-cases/get-customer/get-customer.use-case';
import { AddCustomerAddressUseCase } from '@application/use-cases/add-customer-address/add-customer-address.use-case';
import { SavePaymentMethodUseCase } from '@application/use-cases/save-payment-method/save-payment-method.use-case';
import { UpdateCustomerProfileUseCase } from '@application/use-cases/update-customer-profile/update-customer-profile.use-case';
import { CustomerEntity } from '@infra/database/typeorm/entities/customer.entity';

const DB_URL = process.env.CUSTOMER_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5436/customers';
const RABBIT_URL = process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672';
const EXCHANGE = 'food-ordering';
const TEST_ID = Date.now();

describe('E2E: Complete Customer Lifecycle', () => {
  let dataSource: DataSource;
  let customerRepo: PostgresCustomerRepository;
  let publisherRabbit: RabbitMQConnection;
  let testRabbit: RabbitMQConnection;
  let publisher: RabbitMQEventPublisher;
  let receivedEvents: DomainEvent[];

  beforeAll(async () => {
    receivedEvents = [];

    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [CustomerEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    await dataSource.createQueryRunner().clearTable('customers');

    customerRepo = new PostgresCustomerRepository(dataSource);

    publisherRabbit = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    publisher = new RabbitMQEventPublisher(publisherRabbit);

    // Test connection to verify events
    testRabbit = new RabbitMQConnection({ url: RABBIT_URL, exchange: EXCHANGE });
    await testRabbit.subscribe(
      `e2e-customer-events-${TEST_ID}`,
      ['customer.#'],
      async (event: DomainEvent) => {
        receivedEvents.push(event);
      },
    );

    await new Promise((resolve) => setTimeout(resolve, 500));
  });

  afterAll(async () => {
    await dataSource.destroy();
    await publisherRabbit.close();
    await testRabbit.close();
  });

  it('should complete full customer lifecycle with order integration', async function() { this.timeout(30000);
    // Step 1: Create customer (sign up)
    const createUseCase = new CreateCustomerUseCase(customerRepo, publisher);

    const createResult = await createUseCase.execute({
      name: 'Alice Johnson',
      email: `alice.e2e-${TEST_ID}@example.com`,
      phone: '+5511999999999',
    });

    expect(createResult.customerId).toBeDefined();
    expect(createResult.status).toBe('ACTIVE');

    // Verify persisted in Postgres
    let customer = await customerRepo.findById(createResult.customerId);
    expect(customer).not.toBeNull();
    expect(customer!.getName()).toBe('Alice Johnson');
    expect(customer!.getEmail()).toBe(`alice.e2e-${TEST_ID}@example.com`);

    // Step 2: Update profile
    const updateUseCase = new UpdateCustomerProfileUseCase(customerRepo, publisher);

    await updateUseCase.execute({
      customerId: createResult.customerId,
      name: 'Alice Smith',
    });

    customer = await customerRepo.findById(createResult.customerId);
    expect(customer!.getName()).toBe('Alice Smith');

    // Step 3: Add delivery address
    const addAddressUseCase = new AddCustomerAddressUseCase(customerRepo, publisher);

    await addAddressUseCase.execute({
      customerId: createResult.customerId,
      street: 'Av Brigadeiro Faria Lima',
      number: '1000',
      complement: 'Apto 501',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01451-001',
    });

    customer = await customerRepo.findById(createResult.customerId);
    expect(customer!.getAddresses()).toHaveLength(1);
    expect(customer!.getAddresses()[0].street).toBe('Av Brigadeiro Faria Lima');
    expect(customer!.getAddresses()[0].isDefault).toBe(true);

    // Step 4: Add payment method
    const savePaymentUseCase = new SavePaymentMethodUseCase(customerRepo, publisher);

    await savePaymentUseCase.execute({
      customerId: createResult.customerId,
      token: '4242',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2026,
    });

    customer = await customerRepo.findById(createResult.customerId);
    expect(customer!.getPaymentMethods()).toHaveLength(1);
    expect(customer!.getPaymentMethods()[0].token).toBe('4242');
    expect(customer!.getPaymentMethods()[0].isDefault).toBe(true);

    // Step 5: Add second address (should remove default from first)
    await addAddressUseCase.execute({
      customerId: createResult.customerId,
      street: 'Rua Oscar Freire',
      number: '2000',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01451-002',
    });

    customer = await customerRepo.findById(createResult.customerId);
    expect(customer!.getAddresses()).toHaveLength(2);
    expect(customer!.getAddresses()[0].isDefault).toBe(false);
    expect(customer!.getAddresses()[1].isDefault).toBe(true);

    // Step 6: Simulate order.completed event (as if OrderService emitted it)
    const orderCompletedEvent: DomainEvent = {
      eventId: `evt-e2e-order-${TEST_ID}`,
      eventType: 'order.completed',
      occurredAt: new Date().toISOString(),
      aggregateId: `order-e2e-${TEST_ID}`,
      aggregateType: 'Order',
      data: {
        orderId: `order-e2e-${TEST_ID}`,
        customerId: createResult.customerId,
        restaurantId: 'restaurant-1',
        totalAmount: 150,
        completedAt: new Date().toISOString(),
      },
    };
    await publisherRabbit.publish('order.completed', orderCompletedEvent);

    // Wait for consumer to process
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify customer statistics updated
    customer = await customerRepo.findById(createResult.customerId);
    expect(customer!.getTotalOrders()).toBe(1);
    expect(customer!.getTotalSpent()).toBe(150);

    // Step 7: Simulate another order completion
    const secondOrderEvent: DomainEvent = {
      eventId: `evt-e2e-order2-${TEST_ID}`,
      eventType: 'order.completed',
      occurredAt: new Date().toISOString(),
      aggregateId: `order-e2e2-${TEST_ID}`,
      aggregateType: 'Order',
      data: {
        orderId: `order-e2e2-${TEST_ID}`,
        customerId: createResult.customerId,
        restaurantId: 'restaurant-2',
        totalAmount: 75,
        completedAt: new Date().toISOString(),
      },
    };
    await publisherRabbit.publish('order.completed', secondOrderEvent);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Verify updated statistics
    customer = await customerRepo.findById(createResult.customerId);
    expect(customer!.getTotalOrders()).toBe(2);
    expect(customer!.getTotalSpent()).toBe(225);

    // Step 8: Final customer retrieval
    const getUseCase = new GetCustomerUseCase(customerRepo);
    const finalCustomer = await getUseCase.execute(createResult.customerId);

    expect(finalCustomer).not.toBeNull();
    expect(finalCustomer!.name).toBe('Alice Smith');
    expect(finalCustomer!.status).toBe('ACTIVE');
    expect(finalCustomer!.addresses).toHaveLength(2);
    expect(finalCustomer!.paymentMethods).toHaveLength(1);
    expect(finalCustomer!.totalOrders).toBe(2);
    expect(finalCustomer!.totalSpent).toBe(225);
  });
});
