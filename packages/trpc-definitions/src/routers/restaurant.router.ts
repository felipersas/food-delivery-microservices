/**
 * Restaurant Router Contract
 * 
 * This file defines the tRPC API contract for Restaurant Service.
 * It provides:
 * - Schema validation with Zod
 * - Type-safe input/output definitions
 * - Procedure signatures for IDE auto-completion
 * 
 * NOTE: This is a contract specification package.
 * Actual implementations are provided by individual services.
 */
import { z } from 'zod';
import { router, publicProcedure } from '../trpc.js';

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

export const restaurantRouter = router({
  /**
   * Get a single menu item by ID
   * Used by Cart Service to fetch current price and availability
   */
  getMenuItem: publicProcedure
    .input(MenuItemInputSchema)
    .output(MenuItemOutputSchema)
    .query(() => {
      // Implementation provided by Restaurant Service
      // This defines the contract; actual logic is in restaurant.trpc.server.ts
      throw new Error('Router contract only - implement in service layer');
    }),

  /**
   * Get all menu items for a restaurant
   * Used by Cart Service for batch price fetching
   */
  getMenuItems: publicProcedure
    .input(RestaurantMenuItemsInputSchema)
    .output(z.array(MenuItemOutputSchema))
    .query(() => {
      throw new Error('Router contract only - implement in service layer');
    }),

  /**
   * Check if a menu item is available
   * Lightweight check for cart validation
   */
  isMenuItemAvailable: publicProcedure
    .input(MenuItemInputSchema)
    .output(z.object({ available: z.boolean() }))
    .query(() => {
      throw new Error('Router contract only - implement in service layer');
    }),
});

export type RestaurantRouter = typeof restaurantRouter;
