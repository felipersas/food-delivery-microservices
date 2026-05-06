import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import type { MenuItemRepository } from '@domain/repositories/menu-item.repository.interface';
import type { GetMenuItemOutput } from './get-menu-item.dto';
import { MENU_ITEM_REPOSITORY } from '../../../tokens';

@Injectable()
export class GetMenuItemUseCase {
  constructor(
    @Inject(MENU_ITEM_REPOSITORY) private readonly menuItemRepository: MenuItemRepository,
  ) {}

  async execute(id: string): Promise<GetMenuItemOutput | null> {
    const menuItem = await this.menuItemRepository.findById(id);

    if (!menuItem) {
      throw new NotFoundException(`Menu item ${id} not found`);
    }

    return this.mapToOutput(menuItem);
  }

  private mapToOutput(menuItem: MenuItem): GetMenuItemOutput {
    return {
      id: menuItem.getId(),
      restaurantId: menuItem.getRestaurantId(),
      name: menuItem.getName(),
      description: menuItem.getDescription(),
      priceAmount: menuItem.getPriceAmount(),
      priceCents: menuItem.getPriceCents(),
      category: menuItem.getCategory(),
      imageUrl: menuItem.getImageUrl(),
      available: menuItem.isAvailable(),
      preparationTimeMinutes: menuItem.getPreparationTimeMinutes(),
      createdAt: menuItem.getCreatedAt(),
      updatedAt: menuItem.getUpdatedAt(),
    };
  }
}
