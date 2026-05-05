import { Inject, Injectable, ConflictException } from '@nestjs/common';
import { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { CreateCustomerInput, CreateCustomerOutput } from './create-customer.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/customer-event.publisher';
import { CUSTOMER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreateCustomerInput): Promise<CreateCustomerOutput> {
    const existing = await this.customerRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const customer = Customer.create({
      name: input.name,
      email: input.email,
      phone: input.phone,
    });

    await this.customerRepository.save(customer);

    const events = customer.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    customer.clearDomainEvents();

    return {
      customerId: customer.getId(),
      status: customer.getStatus(),
    };
  }
}
