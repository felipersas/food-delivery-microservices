import { router } from './trpc';
import { restaurantRouter } from './routers/restaurant.router';

/**
 * Root tRPC router combining all service routers
 * This provides a single entry point for the tRPC API
 */
export const appRouter = router({
  restaurant: restaurantRouter,
  // Add more service routers here as needed
  // e.g., order: orderRouter,
  //       kitchen: kitchenRouter,
});

export type AppRouter = typeof appRouter;
