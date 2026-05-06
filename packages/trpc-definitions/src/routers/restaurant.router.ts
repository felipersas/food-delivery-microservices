import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { router, publicProcedure } from '../trpc.js';
import { ResourceNotFoundException, DomainException } from '@app/shared';

/**
 * Schema definitions for Restaurant Service procedures
 */

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
 * Restaurant Router
 * Defines procedures that Restaurant Service exposes to other services
 */
export const restaurantRouter = router({
  /**
   * Get a single menu item by ID
   * Used by Cart Service to fetch current price and availability
   */
  getMenuItem: publicProcedure
    .input(MenuItemInputSchema)
    .output(MenuItemOutputSchema)
    .query(async ({ input, ctx }) => {
      // This procedure will be implemented by Restaurant Service
      // The actual data fetching happens in the service layer
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Procedure not implemented - use with Restaurant Service implementation',
      });
    }),

  /**
   * Get all menu items for a restaurant
   * Used by Cart Service for batch price fetching
   */
  getMenuItems: publicProcedure
    .input(RestaurantMenuItemsInputSchema)
    .output(z.array(MenuItemOutputSchema))
    .query(async ({ input, ctx }) => {
      // This procedure will be implemented by Restaurant Service
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Procedure not implemented - use with Restaurant Service implementation',
      });
    }),

  /**
   * Check if a menu item is available
   * Lightweight check for cart validation
   */
  isMenuItemAvailable: publicProcedure
    .input(MenuItemInputSchema)
    .output(z.object({ available: z.boolean() }))
    .query(async ({ input }) => {
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Procedure not implemented - use with Restaurant Service implementation',
      });
    }),
});

export type RestaurantRouter = typeof restaurantRouter;
