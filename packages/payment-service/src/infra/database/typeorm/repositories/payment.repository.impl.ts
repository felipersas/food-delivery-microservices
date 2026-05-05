import { DataSource } from 'typeorm';
import { Money } from '@app/shared';
import { Payment, PaymentStatus, PaymentMethod } from '@domain/aggregates/payment.aggregate';
import { PaymentEntity } from '@infra/database/typeorm/entities/payment.entity';
import type { PaymentRepository } from '@domain/repositories/payment.repository.interface';

export class PostgresPaymentRepository implements PaymentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Payment | null> {
    const repo = this.dataSource.getRepository(PaymentEntity);
    const entity = await repo.findOne({ where: { id } });
    if (!entity) return null;
    return this.toDomain(entity);
  }

  async save(payment: Payment): Promise<void> {
    const repo = this.dataSource.getRepository(PaymentEntity);
    const entity = this.toEntity(payment);
    await repo.save(entity);
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(PaymentEntity);
    await repo.delete(id);
  }

  private toDomain(entity: PaymentEntity): Payment {
    return Payment.reconstitute({
      id: entity.id,
      orderId: entity.orderId,
      amount: Money.BRLFromCents(entity.amountCents),
      method: entity.method as PaymentMethod,
      status: entity.status as PaymentStatus,
      version: entity.version,
      paymentMethodToken: entity.paymentMethodToken ?? undefined,
      paymentMethodBrand: entity.paymentMethodBrand ?? undefined,
      customerId: entity.customerId ?? undefined,
      refundedAmount: Money.BRLFromCents(entity.refundedAmountCents ?? 0),
    });
  }

  private toEntity(payment: Payment): PaymentEntity {
    const entity = new PaymentEntity();
    entity.id = payment.getId();
    entity.orderId = payment.getOrderId();
    entity.amountCents = payment.getAmount().cents;
    entity.method = payment.getMethod();
    entity.status = payment.getStatus();
    entity.version = payment.getVersion();
    entity.customerId = payment.getCustomerId();
    entity.paymentMethodToken = payment.getPaymentMethodToken();
    entity.paymentMethodBrand = payment.getPaymentMethodBrand();
    entity.refundedAmountCents = payment.getRefundedAmount().cents;
    return entity;
  }
}
