import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { RemovePaymentMethodInput, RemovePaymentMethodOutput } from './remove-payment-method.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/customer-event.publisher';
import { CUSTOMER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class RemovePaymentMethodUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: RemovePaymentMethodInput): Promise<RemovePaymentMethodOutput> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${input.customerId} not found`);
    }

    customer.removePaymentMethod(input.paymentMethodIndex);

    await this.customerRepository.save(customer);

    const events = customer.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    customer.clearDomainEvents();

    return {
      customerId: customer.getId(),
      remainingPaymentMethods: customer.getPaymentMethods().length,
    };
  }
}
