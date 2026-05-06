import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { MenuItem } from '@domain/aggregates/menu-item.aggregate';
import type { MenuItemRepository } from '@domain/repositories/menu-item.repository.interface';
import type { EventPublisher } from '@infra/messaging/rabbitmq/restaurant-event.publisher';
import type { DeleteMenuItemOutput } from './delete-menu-item.dto';
import { MENU_ITEM_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class DeleteMenuItemUseCase {
  constructor(
    @Inject(MENU_ITEM_REPOSITORY) private readonly menuItemRepository: MenuItemRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(id: string): Promise<DeleteMenuItemOutput> {
    const menuItem = await this.menuItemRepository.findById(id);

    if (!menuItem) {
      throw new NotFoundException(`Menu item ${id} not found`);
    }

    // Emit deletion event before deleting
    menuItem.delete();

    const events = menuItem.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    menuItem.clearDomainEvents();

    // Delete from repository
    await this.menuItemRepository.delete(id);

    return {
      menuItemId: id,
      deleted: true,
    };
  }
}
