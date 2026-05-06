import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import type { MenuItemRepository } from '@domain/repositories/menu-item.repository.interface';
import { MenuItemEntity } from '@infra/database/typeorm/entities/menu-item.entity';
import { MenuItemCategoryEnum } from '@domain/value-objects/menu-item-category.vo';

@Injectable()
export class PostgresMenuItemRepository implements MenuItemRepository {
  private menuItemRepo: Repository<MenuItemEntity>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    this.menuItemRepo = this.dataSource.getRepository(MenuItemEntity);
  }

  async findById(id: string): Promise<MenuItem | null> {
    const entity = await this.menuItemRepo.findOne({ where: { id } });
    if (!entity) return null;

    return this.mapToAggregate(entity);
  }

  async save(aggregate: MenuItem): Promise<void> {
    const entity = this.mapToEntity(aggregate);

    const existing = await this.menuItemRepo.findOne({
      where: { id: aggregate.getId() },
    });

    if (existing) {
      await this.menuItemRepo.update(entity.id, entity);
    } else {
      await this.menuItemRepo.insert(entity);
    }
  }

  async delete(id: string): Promise<void> {
    await this.menuItemRepo.delete({ id });
  }

  async findByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    const entities = await this.menuItemRepo.find({
      where: { restaurantId },
      order: { name: 'ASC' },
    });

    return entities.map((e) => this.mapToAggregate(e));
  }

  async findAvailableByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    const entities = await this.menuItemRepo.find({
      where: { restaurantId, available: true },
      order: { category: 'ASC', name: 'ASC' },
    });

    return entities.map((e) => this.mapToAggregate(e));
  }

  async findByRestaurantIdAndCategory(
    restaurantId: string,
    category: MenuItemCategoryEnum,
  ): Promise<MenuItem[]> {
    const entities = await this.menuItemRepo.find({
      where: { restaurantId, category },
      order: { name: 'ASC' },
    });

    return entities.map((e) => this.mapToAggregate(e));
  }

  async findByCategory(category: MenuItemCategoryEnum): Promise<MenuItem[]> {
    const entities = await this.menuItemRepo.find({
      where: { category, available: true },
      order: { name: 'ASC' },
    });

    return entities.map((e) => this.mapToAggregate(e));
  }

  private mapToAggregate(entity: MenuItemEntity): MenuItem {
    return MenuItem.reconstitute({
      id: entity.id,
      restaurantId: entity.restaurantId,
      name: entity.name,
      description: entity.description,
      priceCents: entity.priceCents,
      category: entity.category as MenuItemCategoryEnum,
      imageUrl: entity.imageUrl,
      available: entity.available,
      preparationTimeMinutes: entity.preparationTimeMinutes,
      version: entity.version,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    });
  }

  private mapToEntity(aggregate: MenuItem): MenuItemEntity {
    const entity = new MenuItemEntity();
    entity.id = aggregate.getId();
    entity.restaurantId = aggregate.getRestaurantId();
    entity.name = aggregate.getName();
    entity.description = aggregate.getDescription();
    entity.priceCents = aggregate.getPriceCents();
    entity.category = aggregate.getCategory();
    entity.imageUrl = aggregate.getImageUrl();
    entity.available = aggregate.isAvailable();
    entity.preparationTimeMinutes = aggregate.getPreparationTimeMinutes();
    entity.version = aggregate.getVersion();
    entity.createdAt = aggregate.getCreatedAt();
    entity.updatedAt = aggregate.getUpdatedAt();
    return entity;
  }
}
