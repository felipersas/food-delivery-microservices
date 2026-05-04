import { Money } from '@app/shared';
import { Payment, PaymentMethod } from '../../../domain/aggregates/payment.aggregate';
import type { ProcessPaymentInput, ProcessPaymentOutput } from './process-payment.dto';

export class ProcessPaymentUseCase {
  async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    const payment = new Payment({
      orderId: input.orderId,
      amount: Money.BRL(input.amount),
      method: input.method as PaymentMethod,
    });

    // Simulate payment processing (always confirms for now)
    payment.confirm();

    return {
      paymentId: payment.getId(),
      status: payment.getStatus(),
    };
  }
}
