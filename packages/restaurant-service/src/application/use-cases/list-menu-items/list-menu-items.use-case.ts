import { Inject, Injectable } from '@nestjs/common';
import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import type { MenuItemRepository } from '@domain/repositories/menu-item.repository.interface';
import type { ListMenuItemsInput, ListMenuItemsOutput } from './list-menu-items.dto';
import { MENU_ITEM_REPOSITORY } from '../../../tokens';

@Injectable()
export class ListMenuItemsUseCase {
  constructor(
    @Inject(MENU_ITEM_REPOSITORY) private readonly menuItemRepository: MenuItemRepository,
  ) {}

  async execute(input: ListMenuItemsInput): Promise<ListMenuItemsOutput> {
    let items: MenuItem[];

    if (input.restaurantId && input.category) {
      items = await this.menuItemRepository.findByRestaurantIdAndCategory(
        input.restaurantId,
        input.category,
      );
    } else if (input.restaurantId) {
      items = input.available
        ? await this.menuItemRepository.findAvailableByRestaurantId(input.restaurantId)
        : await this.menuItemRepository.findByRestaurantId(input.restaurantId);
    } else if (input.category) {
      items = await this.menuItemRepository.findByCategory(input.category);
    } else {
      // Return all available items if no filters
      items = await this.menuItemRepository.findByRestaurantId(input.restaurantId ?? '');
    }

    // Filter by availability if specified
    if (input.available !== undefined) {
      items = items.filter((item) => item.isAvailable() === input.available);
    }

    return {
      items: items.map((item) => ({
        id: item.getId(),
        restaurantId: item.getRestaurantId(),
        name: item.getName(),
        description: item.getDescription(),
        priceAmount: item.getPriceAmount(),
        category: item.getCategory(),
        imageUrl: item.getImageUrl(),
        available: item.isAvailable(),
        preparationTimeMinutes: item.getPreparationTimeMinutes(),
      })),
      total: items.length,
    };
  }
}
