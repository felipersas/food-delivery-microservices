import { Money } from '@app/shared';
import { Payment, PaymentMethod } from '@domain/aggregates/payment.aggregate';
import type { PaymentRepository } from '@domain/repositories/payment.repository.interface';
import type { ProcessPaymentInput, ProcessPaymentOutput } from './process-payment.dto';

export class ProcessPaymentUseCase {
  constructor(private readonly paymentRepository: PaymentRepository) {}

  async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    const payment = new Payment({
      orderId: input.orderId,
      amount: Money.BRL(input.amount),
      method: input.method as PaymentMethod,
      paymentMethodToken: input.paymentMethodToken,
      paymentMethodBrand: input.paymentMethodBrand,
      customerId: input.customerId,
    });

    // Simulate payment processing — random rejection for realism
    if (input.amount > 1000) {
      payment.reject('Amount exceeds limit');
    } else {
      payment.confirm();
    }

    await this.paymentRepository.save(payment);

    return {
      paymentId: payment.getId(),
      status: payment.getStatus(),
    };
  }
}
