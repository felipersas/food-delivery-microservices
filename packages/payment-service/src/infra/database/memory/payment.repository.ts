import type { Payment } from '@domain/aggregates/payment.aggregate';
import type { PaymentRepository } from '@domain/repositories/payment.repository.interface';

export class InMemoryPaymentRepository implements PaymentRepository {
  private payments: Map<string, Payment> = new Map();

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) ?? null;
  }

  async save(aggregate: Payment): Promise<void> {
    this.payments.set(aggregate.getId(), aggregate);
  }

  async delete(id: string): Promise<void> {
    this.payments.delete(id);
  }
}
