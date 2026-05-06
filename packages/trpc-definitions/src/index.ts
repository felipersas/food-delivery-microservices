/**
 * tRPC Definitions Package
 *
 * Shared tRPC routers and types for inter-service communication
 * Enables type-safe synchronous calls between microservices
 */

// tRPC configuration
export { initTRPC } from '@trpc/server';
export type { CreateTRPCContext } from './context.js';

// Router exports
export { router, publicProcedure, protectedProcedure, adminProcedure } from './trpc.js';
export { appRouter, type AppRouter } from './root.router.js';

// Individual router exports for service composition
export { restaurantRouter, type RestaurantRouter } from './routers/restaurant.router.js';
