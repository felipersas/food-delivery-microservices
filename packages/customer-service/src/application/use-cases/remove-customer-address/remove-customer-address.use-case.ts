import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { RemoveCustomerAddressInput, RemoveCustomerAddressOutput } from './remove-customer-address.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/customer-event.publisher';
import { CUSTOMER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class RemoveCustomerAddressUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: RemoveCustomerAddressInput): Promise<RemoveCustomerAddressOutput> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${input.customerId} not found`);
    }

    customer.removeAddress(input.addressIndex);

    await this.customerRepository.save(customer);

    const events = customer.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    customer.clearDomainEvents();

    return {
      customerId: customer.getId(),
      remainingAddresses: customer.getAddresses().length,
    };
  }
}
