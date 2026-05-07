import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository, Equal } from 'typeorm';
import { Cart } from '../../../../domain/aggregates/cart.aggregate';
import type { CartRepository } from '../../../../domain/repositories/cart.repository.interface';
import { CartEntity, type CartItemEntityProps } from '../entities/cart.entity';
import { CartItem } from '../../../../domain/value-objects/cart-item.vo';
import { Money } from '@app/shared';

@Injectable()
export class PostgresCartRepository implements CartRepository {
  private cartRepo: Repository<CartEntity>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    this.cartRepo = this.dataSource.getRepository(CartEntity);
  }

  async findById(id: string): Promise<Cart | null> {
    const entity = await this.cartRepo.findOne({ where: { id } });
    if (!entity) return null;

    return this.mapToAggregate(entity);
  }

  async save(aggregate: Cart): Promise<void> {
    const entity = this.mapToEntity(aggregate);

    const existing = await this.cartRepo.findOne({
      where: { id: aggregate.getId() },
    });

    if (existing) {
      await this.cartRepo.update(entity.id, entity);
    } else {
      await this.cartRepo.insert(entity);
    }
  }

  async delete(id: string): Promise<void> {
    await this.cartRepo.delete({ id });
  }

  async findActiveByCustomerId(customerId: string): Promise<Cart | null> {
    const entity = await this.cartRepo.findOne({
      where: {
        customerId: Equal(customerId),
        status: Equal('active' as any),
      },
    });

    if (!entity) return null;

    return this.mapToAggregate(entity);
  }

  async findAllActive(): Promise<Cart[]> {
    const entities = await this.cartRepo.find({
      where: { status: Equal('active' as any) },
    });

    return entities.map((entity) => this.mapToAggregate(entity));
  }

  private mapToAggregate(entity: CartEntity): Cart {
    const items = entity.items.map((item) =>
      CartItem.create({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Money.BRLFromCents(item.unitPriceCents),
        restaurantId: item.restaurantId,
      }),
    );

    return Cart.reconstitute({
      id: entity.id,
      customerId: entity.customerId,
      restaurantId: entity.restaurantId,
      items: entity.items,
      status: entity.status,
      totalAmountCents: entity.totalAmountCents,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private mapToEntity(aggregate: Cart): CartEntity {
    const entity = new CartEntity();
    entity.id = aggregate.getId();
    entity.customerId = aggregate.getCustomerId();
    entity.restaurantId = aggregate.getRestaurantId();
    entity.items = aggregate.getItems().map((item) => ({
      productId: item.productId,
      productName: item.productName,
      quantity: item.quantity,
      unitPriceCents: item.unitPrice.cents,
      restaurantId: item.restaurantId,
    }));
    entity.totalAmountCents = aggregate.getTotalAmount().cents;
    entity.status = aggregate.getStatus();
    entity.version = aggregate.getVersion();
    entity.createdAt = aggregate.getCreatedAt();
    entity.updatedAt = aggregate.getUpdatedAt();
    return entity;
  }
}
