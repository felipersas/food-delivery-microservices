import type { Repository } from '@app/shared';
import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import { MenuItemCategoryEnum } from '@domain/value-objects/menu-item-category.vo';

export interface MenuItemRepository extends Repository<MenuItem> {
  findByRestaurantId(restaurantId: string): Promise<MenuItem[]>;
  findAvailableByRestaurantId(restaurantId: string): Promise<MenuItem[]>;
  findByRestaurantIdAndCategory(restaurantId: string, category: MenuItemCategoryEnum): Promise<MenuItem[]>;
  findByCategory(category: MenuItemCategoryEnum): Promise<MenuItem[]>;
}
