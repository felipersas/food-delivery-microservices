import { DataSource } from 'typeorm';
import { Money } from '@app/shared';
import { Order } from '@domain/aggregates/order.aggregate';
import { OrderStatusEnum } from '@domain/value-objects/order-status.vo';
import { OrderItem } from '@domain/value-objects/order-item.vo';
import { OrderEntity } from '@infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '@infra/database/typeorm/entities/order-item.entity';
import type { OrderRepository } from '@domain/repositories/order.repository.interface';
import { v4 as uuidv4 } from 'uuid';

export class PostgresOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Order | null> {
    const repo = this.dataSource.getRepository(OrderEntity);
    const entity = await repo.findOne({ where: { id } });

    if (!entity) return null;

    return this.toDomain(entity);
  }

  async findByCustomerId(customerId: string): Promise<Order[]> {
    const repo = this.dataSource.getRepository(OrderEntity);
    const entities = await repo.find({
      where: { customerId },
      order: { createdAt: 'DESC' },
    });

    return entities.map((entity) => this.toDomain(entity));
  }

  async save(order: Order): Promise<void> {
    const repo = this.dataSource.getRepository(OrderEntity);
    const itemRepo = this.dataSource.getRepository(OrderItemEntity);

    const entity = this.toEntity(order);
    const existing = await repo.findOne({ where: { id: order.getId() } });

    if (existing) {
      await itemRepo.delete({ orderId: order.getId() });
      await repo.save(entity);
      // Explicitly save items to ensure cascade works after delete
      if (entity.items.length > 0) {
        await itemRepo.save(entity.items);
      }
    } else {
      await repo.save(entity);
    }
  }

  async delete(id: string): Promise<void> {
    const repo = this.dataSource.getRepository(OrderEntity);
    const itemRepo = this.dataSource.getRepository(OrderItemEntity);
    await itemRepo.delete({ orderId: id });
    await repo.delete(id);
  }

  private toDomain(entity: OrderEntity): Order {
    const items = entity.items.map(
      (item) =>
        OrderItem.create({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Money.BRLFromCents(item.unitPriceCents),
        }),
    );

    return Order.reconstitute({
      id: entity.id,
      customerId: entity.customerId,
      restaurantId: entity.restaurantId,
      items,
      status: entity.status as OrderStatusEnum,
      totalAmount: Money.BRLFromCents(entity.totalAmountCents),
      version: entity.version,
      paymentMethodIndex: entity.paymentMethodIndex ?? undefined,
      paymentMethodType: entity.paymentMethodType as 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH' | undefined,
    });
  }

  private toEntity(order: Order): OrderEntity {
    const entity = new OrderEntity();
    entity.id = order.getId();
    entity.customerId = order.getCustomerId();
    entity.restaurantId = order.getRestaurantId();
    entity.status = order.getStatus();
    entity.totalAmountCents = order.getTotalAmount().cents;
    entity.version = order.getVersion();
    entity.paymentMethodIndex = order.getPaymentMethodIndex();
    entity.paymentMethodType = order.getPaymentMethodType();
    entity.items = order.getItems().map((item) => {
      const itemEntity = new OrderItemEntity();
      itemEntity.id = uuidv4();
      itemEntity.orderId = order.getId();
      itemEntity.productId = item.productId;
      itemEntity.productName = item.productName;
      itemEntity.quantity = item.quantity;
      itemEntity.unitPriceCents = item.unitPrice.cents;
      return itemEntity;
    });
    return entity;
  }
}
