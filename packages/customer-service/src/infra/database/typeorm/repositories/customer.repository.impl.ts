import { DataSource } from 'typeorm';
import { Customer } from '@domain/aggregates/customer.aggregate';
import { CustomerStatusEnum } from '@domain/value-objects/customer-status.vo';
import { CustomerAddress } from '@domain/value-objects/customer-address.vo';
import { PaymentMethod } from '@domain/value-objects/payment-method.vo';
import { CustomerEntity } from '@infra/database/typeorm/entities/customer.entity';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';

export class PostgresCustomerRepository implements CustomerRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Customer | null> {
    const repo = this.dataSource.getRepository(CustomerEntity);
    const entity = await repo.findOne({ where: { id } });

    if (!entity) return null;

    return this.toDomain(entity);
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const repo = this.dataSource.getRepository(CustomerEntity);
    const entity = await repo.findOne({ where: { email: email.toLowerCase() } });

    if (!entity) return null;

    return this.toDomain(entity);
  }

  async findAll(): Promise<Customer[]> {
    const repo = this.dataSource.getRepository(CustomerEntity);
    const entities = await repo.find();
    return entities.map((e) => this.toDomain(e));
  }

  async save(customer: Customer): Promise<void> {
    const repo = this.dataSource.getRepository(CustomerEntity);
    const entity = this.toEntity(customer);
    await repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(CustomerEntity);
    await repo.delete(id);
  }

  private toDomain(entity: CustomerEntity): Customer {
    const addresses = entity.addresses.map(
      (addr) =>
        CustomerAddress.create({
          street: addr.street,
          number: addr.number,
          complement: addr.complement,
          city: addr.city,
          state: addr.state,
          zipCode: addr.zipCode,
          isDefault: addr.isDefault,
        }),
    );

    const paymentMethods = entity.paymentMethods.map(
      (pm) =>
        PaymentMethod.create({
          token: pm.token,
          brand: pm.brand as any,
          expiryMonth: pm.expiryMonth,
          expiryYear: pm.expiryYear,
          isDefault: pm.isDefault,
        }),
    );

    return Customer.reconstitute({
      id: entity.id,
      name: entity.name,
      email: entity.email,
      phone: entity.phone,
      status: entity.status as CustomerStatusEnum,
      addresses,
      paymentMethods,
      totalOrders: entity.totalOrders,
      totalSpent: Number(entity.totalSpent),
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private toEntity(customer: Customer): CustomerEntity {
    const entity = new CustomerEntity();
    entity.id = customer.getId();
    entity.name = customer.getName();
    entity.email = customer.getEmail();
    entity.phone = customer.getPhone();
    entity.status = customer.getStatus();
    entity.addresses = customer.getAddresses().map((addr) => ({
      street: addr.street,
      number: addr.number,
      complement: addr.complement,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      isDefault: addr.isDefault,
    }));
    entity.paymentMethods = customer.getPaymentMethods().map((pm) => ({
      token: pm.token,
      brand: pm.brand,
      expiryMonth: pm.expiryMonth,
      expiryYear: pm.expiryYear,
      isDefault: pm.isDefault,
    }));
    entity.totalOrders = customer.getTotalOrders();
    entity.totalSpent = customer.getTotalSpent();
    entity.version = customer.getVersion();
    entity.createdAt = customer.getCreatedAt();
    entity.updatedAt = customer.getUpdatedAt();
    return entity;
  }
}
