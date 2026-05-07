import { Inject, Injectable } from '@nestjs/common';
import { Router, Query, Input } from 'nestjs-trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { GetMenuItemUseCase } from '../../application/use-cases/get-menu-item/get-menu-item.use-case';
import { ListMenuItemsUseCase } from '../../application/use-cases/list-menu-items/list-menu-items.use-case';

const MenuItemOutputSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  priceCents: z.number().int().positive(),
  available: z.boolean(),
  restaurantId: z.string().uuid(),
  category: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

const MenuItemInputSchema = z.object({
  id: z.string().uuid(),
});

const RestaurantMenuItemsInputSchema = z.object({
  restaurantId: z.string().uuid(),
});

/**
 * Restaurant tRPC Router
 *
 * Decorator-based router using nestjs-trpc adapter.
 * Exposes Restaurant Service procedures to other microservices.
 *
 * Usage:
 * - Import TrpcModule in AppModule
 * - Procedures auto-registered with tRPC
 * - Full type safety with Zod schemas
 */
@Injectable()
@Router({ alias: 'restaurant' })
export class RestaurantRouter {
  constructor(
    @Inject(GetMenuItemUseCase)
    private readonly getMenuItemUseCase: GetMenuItemUseCase,
    @Inject(ListMenuItemsUseCase)
    private readonly listMenuItemsUseCase: ListMenuItemsUseCase,
  ) {}

  /**
   * Get a single menu item by ID
   * Used by Cart Service to fetch current price and availability
   */
  @Query({
    input: MenuItemInputSchema,
    output: MenuItemOutputSchema,
  })
  async getMenuItem(@Input('id') id: string) {
    const result = await this.getMenuItemUseCase.execute(id);

    if (!result) {
      throw new TRPCError({
        code: 'NOT_FOUND',
        message: `Menu item with id "${id}" not found`,
      });
    }

    return {
      id: result.id,
      name: result.name,
      description: result.description,
      priceCents: result.priceCents,
      available: result.available,
      restaurantId: result.restaurantId,
      category: result.category,
      imageUrl: result.imageUrl ?? undefined,
    };
  }

  /**
   * Get all menu items for a restaurant
   * Used by Cart Service for batch price fetching
   */
  @Query({
    input: RestaurantMenuItemsInputSchema,
    output: z.array(MenuItemOutputSchema),
  })
  async getMenuItems(@Input('restaurantId') restaurantId: string) {
    const result = await this.listMenuItemsUseCase.execute({ restaurantId });

    return result.items.map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      priceCents: item.priceAmount,
      available: item.available,
      restaurantId: item.restaurantId,
      category: item.category,
      imageUrl: item.imageUrl ?? undefined,
    }));
  }

  /**
   * Check if a menu item is available
   * Lightweight check for cart validation
   */
  @Query({
    input: MenuItemInputSchema,
    output: z.object({ available: z.boolean() }),
  })
  async isMenuItemAvailable(@Input('id') id: string) {
    const result = await this.getMenuItemUseCase.execute(id);

    return {
      available: result?.available ?? false,
    };
  }
}
