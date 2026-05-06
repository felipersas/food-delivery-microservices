import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import type { MenuItemRepository } from '@domain/repositories/menu-item.repository.interface';
import type { EventPublisher } from '@infra/messaging/rabbitmq/restaurant-event.publisher';
import type { UpdateMenuItemInput, UpdateMenuItemOutput } from './update-menu-item.dto';
import { MENU_ITEM_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class UpdateMenuItemUseCase {
  constructor(
    @Inject(MENU_ITEM_REPOSITORY) private readonly menuItemRepository: MenuItemRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(
    id: string,
    input: UpdateMenuItemInput,
  ): Promise<UpdateMenuItemOutput> {
    const menuItem = await this.menuItemRepository.findById(id);

    if (!menuItem) {
      throw new NotFoundException(`Menu item ${id} not found`);
    }

    // Update basic details
    if (input.name || input.description || input.imageUrl !== undefined || input.preparationTimeMinutes) {
      menuItem.updateDetails({
        name: input.name,
        description: input.description,
        imageUrl: input.imageUrl,
        preparationTimeMinutes: input.preparationTimeMinutes,
      });
    }

    // Update price
    if (input.priceAmount !== undefined) {
      menuItem.updatePrice(input.priceAmount);
    }

    // Update category
    if (input.category !== undefined) {
      menuItem.updateCategory(input.category);
    }

    // Update availability
    if (input.available !== undefined) {
      if (input.available) {
        menuItem.markAsAvailable();
      } else {
        menuItem.markAsUnavailable();
      }
    }

    await this.menuItemRepository.save(menuItem);

    const events = menuItem.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    menuItem.clearDomainEvents();

    return {
      menuItemId: menuItem.getId(),
      name: menuItem.getName(),
      priceAmount: menuItem.getPriceAmount(),
      category: menuItem.getCategory(),
      available: menuItem.isAvailable(),
      updatedAt: menuItem.getUpdatedAt(),
    };
  }
}
