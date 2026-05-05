import type { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';

export class InMemoryCustomerRepository implements CustomerRepository {
  private customers: Map<string, Customer> = new Map();

  async findById(id: string): Promise<Customer | null> {
    return this.customers.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<Customer | null> {
    const normalizedEmail = email.toLowerCase();
    for (const customer of this.customers.values()) {
      if (customer.getEmail() === normalizedEmail) {
        return customer;
      }
    }
    return null;
  }

  async findAll(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async save(aggregate: Customer): Promise<void> {
    this.customers.set(aggregate.getId(), aggregate);
  }

  async delete(id: string): Promise<void> {
    this.customers.delete(id);
  }

  // Helper method for testing
  clear(): void {
    this.customers.clear();
  }

  // Helper method for testing
  get size(): number {
    return this.customers.size;
  }
}
