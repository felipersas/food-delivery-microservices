import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Customer } from '@domain/aggregates/customer.aggregate';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import type { SavePaymentMethodInput, SavePaymentMethodOutput } from './save-payment-method.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/customer-event.publisher';
import { CUSTOMER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class SavePaymentMethodUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: SavePaymentMethodInput): Promise<SavePaymentMethodOutput> {
    const customer = await this.customerRepository.findById(input.customerId);
    if (!customer) {
      throw new NotFoundException(`Customer ${input.customerId} not found`);
    }

    const { customerId, ...paymentProps } = input;
    customer.savePaymentMethod(paymentProps);

    await this.customerRepository.save(customer);

    const events = customer.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    customer.clearDomainEvents();

    const methods = customer.getPaymentMethods();
    const saved = methods[methods.length - 1];

    return {
      customerId: customer.getId(),
      paymentMethodCount: methods.length,
      brand: saved.brand,
      last4: saved.token,
    };
  }
}
