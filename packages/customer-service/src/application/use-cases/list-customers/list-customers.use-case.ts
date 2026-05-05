import { Inject, Injectable } from '@nestjs/common';
import { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { ListCustomersInput, ListCustomersOutput, CustomerListItem } from './list-customers.dto';
import { CUSTOMER_REPOSITORY } from '../../../tokens';

@Injectable()
export class ListCustomersUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository) {}

  async execute(input: ListCustomersInput): Promise<ListCustomersOutput> {
    // For now, simple in-memory filtering. In a real implementation,
    // this would be delegated to the repository with proper pagination.
    const allCustomers = await this.customerRepository.findAll();

    let filtered = allCustomers;

    // Status filter
    if (input.status) {
      filtered = filtered.filter((c) => c.getStatus() === input.status);
    }

    // Search filter
    if (input.search) {
      const searchLower = input.search.toLowerCase();
      filtered = filtered.filter(
        (c: Customer) =>
          c.getName().toLowerCase().includes(searchLower) ||
          c.getEmail().toLowerCase().includes(searchLower),
      );
    }

    // Sorting
    filtered.sort((a: Customer, b: Customer) => {
      let comparison = 0;

      switch (input.sortBy) {
        case 'name':
          comparison = a.getName().localeCompare(b.getName());
          break;
        case 'email':
          comparison = a.getEmail().localeCompare(b.getEmail());
          break;
        case 'totalOrders':
          comparison = a.getTotalOrders() - b.getTotalOrders();
          break;
        case 'totalSpent':
          comparison = a.getTotalSpent() - b.getTotalSpent();
          break;
        case 'createdAt':
        default:
          comparison = a.getCreatedAt().getTime() - b.getCreatedAt().getTime();
          break;
      }

      return input.sortOrder === 'DESC' ? -comparison : comparison;
    });

    // Pagination
    const total = filtered.length;
    const totalPages = Math.ceil(total / input.limit!);
    const start = input.page! * input.limit!;
    const paginated = filtered.slice(start, start + input.limit!);

    return {
      customers: paginated.map((c) => this.toListItem(c)),
      total,
      page: input.page!,
      limit: input.limit!,
      totalPages,
    };
  }

  private toListItem(customer: Customer): CustomerListItem {
    return {
      customerId: customer.getId(),
      name: customer.getName(),
      email: customer.getEmail(),
      phone: customer.getPhone(),
      status: customer.getStatus(),
      totalOrders: customer.getTotalOrders(),
      totalSpent: customer.getTotalSpent(),
      createdAt: customer.getCreatedAt(),
    };
  }
}
