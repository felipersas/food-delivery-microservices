import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Money } from '@app/shared';
import type { PaymentRepository } from '@domain/repositories/payment.repository.interface';
import type { RefundPaymentInput, RefundPaymentOutput } from './refund-payment.dto';
import type { EventPublisher } from '@infra/messaging/rabbitmq/payment-event.publisher';
import { PAYMENT_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class RefundPaymentUseCase {
  constructor(
    @Inject(PAYMENT_REPOSITORY) private readonly paymentRepository: PaymentRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
    const payment = await this.paymentRepository.findById(input.paymentId);

    if (!payment) {
      throw new NotFoundException(`Payment ${input.paymentId} not found`);
    }

    const refundAmount = Money.BRL(input.amount);
    payment.refund(refundAmount, input.reason, input.refundId);

    await this.paymentRepository.save(payment);

    const events = payment.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    payment.clearDomainEvents();

    // Find the refund event and extract refundId with proper type guard
    const refundEvent = events.find((e) => e.eventType === 'payment.refund.completed');
    const refundId =
      (refundEvent?.data as { refundId?: string } | undefined)?.refundId ?? '';

    return {
      paymentId: payment.getId(),
      status: payment.getStatus(),
      refundedAmount: payment.getRefundedAmount().amount,
      refundId,
    };
  }
}
