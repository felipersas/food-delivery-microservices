import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { UpdateCustomerProfileInput, UpdateCustomerProfileOutput } from './update-customer-profile.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/customer-event.publisher';
import { CUSTOMER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class UpdateCustomerProfileUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: UpdateCustomerProfileInput): Promise<UpdateCustomerProfileOutput> {
    const customer = await this.customerRepository.findById(input.id);
    if (!customer) {
      throw new NotFoundException(`Customer ${input.id} not found`);
    }

    const { id, ...profileUpdates } = input;
    customer.updateProfile(profileUpdates);

    await this.customerRepository.save(customer);

    const events = customer.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    customer.clearDomainEvents();

    return {
      customerId: customer.getId(),
      name: customer.getName(),
      email: customer.getEmail(),
      phone: customer.getPhone(),
      status: customer.getStatus(),
    };
  }
}
