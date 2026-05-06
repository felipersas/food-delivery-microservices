import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import type { MenuItemRepository } from '@domain/repositories/menu-item.repository.interface';
import { MenuItemCategoryEnum } from '@domain/value-objects/menu-item-category.vo';

export class InMemoryMenuItemRepository implements MenuItemRepository {
  private menuItems: Map<string, MenuItem> = new Map();

  async findById(id: string): Promise<MenuItem | null> {
    const item = this.menuItems.get(id);
    return item ?? null;
  }

  async save(aggregate: MenuItem): Promise<void> {
    this.menuItems.set(aggregate.getId(), aggregate);
  }

  async delete(id: string): Promise<void> {
    this.menuItems.delete(id);
  }

  async findByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter((item) => item.getRestaurantId() === restaurantId)
      .sort((a, b) => a.getName().localeCompare(b.getName()));
  }

  async findAvailableByRestaurantId(restaurantId: string): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter(
        (item) =>
          item.getRestaurantId() === restaurantId && item.isAvailable(),
      )
      .sort((a, b) => {
        const categoryCompare = a.getCategory().localeCompare(b.getCategory());
        if (categoryCompare !== 0) return categoryCompare;
        return a.getName().localeCompare(b.getName());
      });
  }

  async findByRestaurantIdAndCategory(
    restaurantId: string,
    category: MenuItemCategoryEnum,
  ): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter(
        (item) =>
          item.getRestaurantId() === restaurantId && item.getCategory() === category,
      )
      .sort((a, b) => a.getName().localeCompare(b.getName()));
  }

  async findByCategory(category: MenuItemCategoryEnum): Promise<MenuItem[]> {
    return Array.from(this.menuItems.values())
      .filter(
        (item) => item.getCategory() === category && item.isAvailable(),
      )
      .sort((a, b) => a.getName().localeCompare(b.getName()));
  }

  clear(): void {
    this.menuItems.clear();
  }
}
