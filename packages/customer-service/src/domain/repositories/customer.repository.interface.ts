import type { Repository } from '@app/shared';
import type { Customer } from '../aggregates/customer.aggregate';

export interface CustomerRepository extends Repository<Customer> {
  findByEmail(email: string): Promise<Customer | null>;
  findAll(): Promise<Customer[]>;
}
