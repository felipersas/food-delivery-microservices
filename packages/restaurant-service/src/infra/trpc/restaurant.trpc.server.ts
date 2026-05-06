import { Inject, Injectable } from '@nestjs/common';
import type { CreateTRPCContext } from '@app/trpc-definitions';
import { publicProcedure } from '@app/trpc-definitions';
import type { GetMenuItemUseCase } from '../../application/use-cases/get-menu-item/get-menu-item.use-case';
import type { ListMenuItemsUseCase } from '../../application/use-cases/list-menu-items/list-menu-items.use-case';
import { GET_MENU_ITEM_USE_CASE, LIST_MENU_ITEMS_USE_CASE } from '../../../tokens';

/**
 * tRPC Server Implementation for Restaurant Service
 * 
 * This file contains the actual implementations of the procedures
 * defined in the shared trpc-definitions package.
 * 
 * Architecture:
 * - Procedures delegate to existing use cases
 * - Use cases handle business logic and domain operations
 * - Repository layer handles data access
 * 
 * Benefits:
 * - Type-safe inter-service communication
 * - Single source of truth for API contracts
 * - Leverages existing business logic
 */

@Injectable()
export class RestaurantTrpcServer {
  constructor(
    @Inject(GET_MENU_ITEM_USE_CASE) private readonly getMenuItemUseCase: GetMenuItemUseCase,
    @Inject(LIST_MENU_ITEMS_USE_CASE) private readonly listMenuItemsUseCase: ListMenuItemsUseCase,
  ) {}

  /**
   * Create tRPC context for each request
   * In inter-service communication, context is minimal (no user auth)
   */
  createContext = (): CreateTRPCContext => {
    return {
      // No userId/userRole for inter-service calls
      // These would be populated when called from API Gateway with authenticated user
    };
  };

  /**
   * Get a single menu item by ID
   * Procedure implementation delegates to GetMenuItemUseCase
   */
  getMenuItem = publicProcedure.query(async ({ input }) => {
    const menuItem = await this.getMenuItemUseCase.execute(input.id);
    
    if (!menuItem) {
      throw new Error('Menu item not found');
    }

    return {
      id: menuItem.id,
      name: menuItem.name,
      description: menuItem.description,
      priceCents: menuItem.priceCents,
      available: menuItem.available,
      restaurantId: menuItem.restaurantId,
      category: menuItem.category,
      imageUrl: menuItem.imageUrl,
    };
  });

  /**
   * Get all menu items for a restaurant
   * Procedure implementation delegates to ListMenuItemsUseCase
   */
  getMenuItems = publicProcedure.query(async ({ input }) => {
    const result = await this.listMenuItemsUseCase.execute({
      restaurantId: input.restaurantId,
      available: true, // Only fetch available items for cart service
    });

    return result.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      priceCents: item.priceCents,
      available: item.available,
      restaurantId: item.restaurantId,
      category: item.category,
      imageUrl: item.imageUrl,
    }));
  });

  /**
   * Check if a menu item is available
   * Lightweight check for cart validation
   */
  isMenuItemAvailable = publicProcedure.query(async ({ input }) => {
    try {
      const menuItem = await this.getMenuItemUseCase.execute(input.id);
      return { available: menuItem?.available ?? false };
    } catch {
      return { available: false };
    }
  });
}
