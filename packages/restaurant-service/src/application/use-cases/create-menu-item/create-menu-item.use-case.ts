import { Inject, Injectable } from '@nestjs/common';
import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import type { MenuItemRepository } from '@domain/repositories/menu-item.repository.interface';
import type { EventPublisher } from '@infra/messaging/rabbitmq/restaurant-event.publisher';
import type { CreateMenuItemInput, CreateMenuItemOutput } from './create-menu-item.dto';
import { MENU_ITEM_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class CreateMenuItemUseCase {
  constructor(
    @Inject(MENU_ITEM_REPOSITORY) private readonly menuItemRepository: MenuItemRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreateMenuItemInput): Promise<CreateMenuItemOutput> {
    const menuItem = MenuItem.create({
      restaurantId: input.restaurantId,
      name: input.name,
      description: input.description,
      priceAmount: input.priceAmount,
      category: input.category,
      imageUrl: input.imageUrl,
      preparationTimeMinutes: input.preparationTimeMinutes,
    });

    await this.menuItemRepository.save(menuItem);

    const events = menuItem.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    menuItem.clearDomainEvents();

    return {
      menuItemId: menuItem.getId(),
      name: menuItem.getName(),
      category: menuItem.getCategory(),
      priceAmount: menuItem.getPriceAmount(),
    };
  }
}
