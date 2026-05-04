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
      amount: Money.BRL(Number(entity.amount)),
      method: entity.method as PaymentMethod,
      status: entity.status as PaymentStatus,
      version: entity.version,
    });
  }

  private toEntity(payment: Payment): PaymentEntity {
    const entity = new PaymentEntity();
    entity.id = payment.getId();
    entity.orderId = payment.getOrderId();
    entity.amount = payment.getAmount().amount;
    entity.method = payment.getMethod();
    entity.status = payment.getStatus();
    entity.version = payment.getVersion();
    return entity;
  }
}
