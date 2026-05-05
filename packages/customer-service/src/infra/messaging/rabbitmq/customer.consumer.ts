import { Injectable, Inject } from '@nestjs/common';
import type { DomainEvent } from '@app/shared';
import type { RabbitMQConnection } from '@app/messaging';
import type { CustomerRepository } from '@domain/repositories/customer.repository.interface';
import { RABBITMQ_CONNECTION, CUSTOMER_REPOSITORY } from '../../../tokens';

@Injectable()
export class CustomerConsumer {
  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    @Inject(CUSTOMER_REPOSITORY) private readonly customerRepository: CustomerRepository,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'customer-service-orders',
      ['order.completed', 'payment.refund.completed'],
      async (event: DomainEvent) => {
        if (event.eventType === 'order.completed') {
          await this.handleOrderCompleted(event);
        } else if (event.eventType === 'payment.refund.completed') {
          await this.handlePaymentRefundCompleted(event);
        }
      },
    );
  }

  private async handleOrderCompleted(event: DomainEvent): Promise<void> {
    const data = event.data as any;

    if (!data.customerId) return;

    const customer = await this.customerRepository.findById(data.customerId);
    if (!customer) return;

    const totalAmount = data.totalAmount ?? 0;
    customer.recordOrder(totalAmount);
    customer.clearDomainEvents();

    await this.customerRepository.save(customer);
  }

  private async handlePaymentRefundCompleted(event: DomainEvent): Promise<void> {
    const data = event.data as any;

    if (!data.customerId) return;

    const customer = await this.customerRepository.findById(data.customerId);
    if (!customer) return;

    const refundedAmount = data.refundedAmount ?? 0;
    customer.recordRefund(refundedAmount);
    customer.clearDomainEvents();

    await this.customerRepository.save(customer);
  }
}
