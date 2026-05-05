import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { GetCustomerOutput } from './get-customer.dto';
import { CUSTOMER_REPOSITORY } from '../../../tokens';

@Injectable()
export class GetCustomerUseCase {
  constructor(@Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository) {}

  async execute(customerId: string): Promise<GetCustomerOutput> {
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${customerId} not found`);
    }

    return this.toOutput(customer);
  }

  private toOutput(customer: Customer): GetCustomerOutput {
    return {
      customerId: customer.getId(),
      name: customer.getName(),
      email: customer.getEmail(),
      phone: customer.getPhone(),
      status: customer.getStatus(),
      totalOrders: customer.getTotalOrders(),
      totalSpent: customer.getTotalSpent(),
      addresses: customer.getAddresses().map((addr: any) => ({
        street: addr.street,
        number: addr.number,
        complement: addr.complement,
        city: addr.city,
        state: addr.state,
        zipCode: addr.zipCode,
        isDefault: addr.isDefault,
      })),
      paymentMethods: customer.getPaymentMethods().map((pm: any) => ({
        brand: pm.brand,
        token: pm.token,
        expiryMonth: pm.expiryMonth,
        expiryYear: pm.expiryYear,
        isDefault: pm.isDefault,
      })),
      createdAt: customer.getCreatedAt(),
      updatedAt: customer.getUpdatedAt(),
    };
  }
}
