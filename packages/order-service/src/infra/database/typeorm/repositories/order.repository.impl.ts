import { DataSource } from 'typeorm';
import { Money } from '@app/shared';
import { Order } from '../../../../domain/aggregates/order.aggregate';
import { OrderItem } from '../../../../domain/value-objects/order-item.vo';
import { OrderEntity } from '../entities/order.entity';
import { OrderItemEntity } from '../entities/order-item.entity';
import { v4 as uuidv4 } from 'uuid';

export class PostgresOrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Order | null> {
    const repo = this.dataSource.getRepository(OrderEntity);
    const entity = await repo.findOne({ where: { id } });

    if (!entity) return null;

    return this.toDomain(entity);
  }

  async save(order: Order): Promise<void> {
    const repo = this.dataSource.getRepository(OrderEntity);
    const itemRepo = this.dataSource.getRepository(OrderItemEntity);

    const entity = this.toEntity(order);
    const existing = await repo.findOne({ where: { id: order.getId() } });

    if (existing) {
      await itemRepo.delete({ orderId: order.getId() });
      await repo.save(entity);
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
        new OrderItem({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPrice: Money.BRL(Number(item.unitPrice)),
        }),
    );

    const order = new Order({
      id: entity.id,
      customerId: entity.customerId,
      restaurantId: entity.restaurantId,
      items,
    });

    // Restore state without emitting events
    while (order.getStatus() !== entity.status && order.getStatus() !== 'CANCELLED') {
      if (entity.status === 'CONFIRMED') order.confirm();
      else if (entity.status === 'PREPARING') order.startPreparing();
      else if (entity.status === 'READY') order.markReady();
      else break;
    }

    order.clearDomainEvents();
    return order;
  }

  private toEntity(order: Order): OrderEntity {
    const entity = new OrderEntity();
    entity.id = order.getId();
    entity.customerId = order.getCustomerId();
    entity.restaurantId = order.getRestaurantId();
    entity.status = order.getStatus();
    entity.totalAmount = order.getTotalAmount().amount;
    entity.version = order.getVersion();
    entity.items = order.getItems().map((item) => {
      const itemEntity = new OrderItemEntity();
      itemEntity.id = uuidv4();
      itemEntity.orderId = order.getId();
      itemEntity.productId = item.productId;
      itemEntity.productName = item.productName;
      itemEntity.quantity = item.quantity;
      itemEntity.unitPrice = item.unitPrice.amount;
      return itemEntity;
    });
    return entity;
  }
}
