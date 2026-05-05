import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { DataSource } from 'typeorm';
import { PostgresCustomerRepository } from '@infra/database/typeorm/repositories/customer.repository.impl';
import { Customer } from '@domain/aggregates/customer.aggregate';
import { CustomerEntity } from '@infra/database/typeorm/entities/customer.entity';

const DB_URL = process.env.CUSTOMER_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5436/customers';

describe('PostgresCustomerRepository (Integration)', () => {
  let dataSource: DataSource;
  let repository: PostgresCustomerRepository;

  beforeAll(async () => {
    dataSource = new DataSource({
      type: 'postgres',
      url: DB_URL,
      entities: [CustomerEntity],
      synchronize: true,
    });
    await dataSource.initialize();
    repository = new PostgresCustomerRepository(dataSource);

    // Clear any existing data
    await dataSource.createQueryRunner().clearTable('customers');
  });

  afterAll(async () => {
    await dataSource.destroy();
  });

  it('should save and retrieve a customer', async () => {
    const customer = Customer.create({
      name: 'John Doe',
      email: 'john@example.com',
      phone: '+5511999999999',
    });
    customer.clearDomainEvents();

    await repository.save(customer);

    const found = await repository.findById(customer.getId());

    expect(found).not.toBeNull();
    expect(found!.getId()).toBe(customer.getId());
    expect(found!.getName()).toBe('John Doe');
    expect(found!.getEmail()).toBe('john@example.com');
    expect(found!.getStatus()).toBe('ACTIVE');
  });

  it('should find customer by email', async () => {
    const customer = Customer.create({
      name: 'Jane Doe',
      email: 'jane.doe@example.com',
      phone: '+5511888888888',
    });
    customer.clearDomainEvents();

    await repository.save(customer);

    const found = await repository.findByEmail('jane.doe@example.com');

    expect(found).not.toBeNull();
    expect(found!.getEmail()).toBe('jane.doe@example.com');
  });

  it('should persist addresses', async () => {
    const customer = Customer.create({
      name: 'Test User',
      email: 'test@example.com',
      phone: '+5511777777777',
    });
    customer.addAddress({
      street: 'Av Paulista',
      number: '1000',
      complement: 'Apt 101',
      city: 'São Paulo',
      state: 'SP',
      zipCode: '01310-100',
    });
    customer.clearDomainEvents();

    await repository.save(customer);

    const found = await repository.findById(customer.getId());

    expect(found!.getAddresses()).toHaveLength(1);
    expect(found!.getAddresses()[0].street).toBe('Av Paulista');
    expect(found!.getAddresses()[0].isDefault).toBe(true);
  });

  it('should persist payment methods', async () => {
    const customer = Customer.create({
      name: 'Payment User',
      email: 'payment@example.com',
      phone: '+5511666666666',
    });
    customer.savePaymentMethod({
      token: '1234',
      brand: 'visa',
      expiryMonth: 12,
      expiryYear: 2026,
    });
    customer.clearDomainEvents();

    await repository.save(customer);

    const found = await repository.findById(customer.getId());

    expect(found!.getPaymentMethods()).toHaveLength(1);
    expect(found!.getPaymentMethods()[0].token).toBe('1234');
    expect(found!.getPaymentMethods()[0].brand).toBe('visa');
  });

  it('should persist order statistics', async () => {
    const customer = Customer.create({
      name: 'Stats User',
      email: 'stats@example.com',
      phone: '+5511555555555',
    });
    customer.recordOrder(100);
    customer.recordOrder(50);
    customer.clearDomainEvents();

    await repository.save(customer);

    const found = await repository.findById(customer.getId());

    expect(found!.getTotalOrders()).toBe(2);
    expect(found!.getTotalSpent()).toBe(150);
  });

  it('should persist status changes', async () => {
    const customer = Customer.create({
      name: 'Status User',
      email: 'status@example.com',
      phone: '+5511444444444',
    });
    customer.clearDomainEvents();

    await repository.save(customer);

    customer.deactivate();
    customer.clearDomainEvents();
    await repository.save(customer);

    const found = await repository.findById(customer.getId());
    expect(found!.getStatus()).toBe('INACTIVE');
  });

  it('should return all customers', async () => {
    // Clear existing data
    await dataSource.createQueryRunner().clearTable('customers');

    const customer1 = Customer.create({
      name: 'List User 1',
      email: 'list1@example.com',
      phone: '+5511333333333',
    });
    const customer2 = Customer.create({
      name: 'List User 2',
      email: 'list2@example.com',
      phone: '+5511222222222',
    });
    customer1.clearDomainEvents();
    customer2.clearDomainEvents();

    await repository.save(customer1);
    await repository.save(customer2);

    const all = await repository.findAll();

    expect(all.length).toBeGreaterThanOrEqual(2);
    const emails = all.map(c => c.getEmail());
    expect(emails).toContain('list1@example.com');
    expect(emails).toContain('list2@example.com');
  });

  it('should delete a customer', async () => {
    const customer = Customer.create({
      name: 'Delete User',
      email: 'delete@example.com',
      phone: '+5511111111111',
    });
    customer.clearDomainEvents();

    await repository.save(customer);
    await repository.delete(customer.getId());

    const found = await repository.findById(customer.getId());
    expect(found).toBeNull();
  });

  it('should return null for non-existent customer', async () => {
    const found = await repository.findById('00000000-0000-0000-0000-000000000000');
    expect(found).toBeNull();
  });
});
