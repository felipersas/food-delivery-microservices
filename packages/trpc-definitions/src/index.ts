/**
 * tRPC Definitions Package
 *
 * Shared tRPC routers and types for inter-service communication
 * Enables type-safe synchronous calls between microservices
 */

// AUTO-GENERATED AppRouter from nestjs-trpc CLI
// Run `npx nestjs-trpc generate` to regenerate after router changes
export type { AppRouter } from './generated/server.js';

// Legacy exports (for backward compatibility during migration)
// TODO: Remove after full migration to decorator-based routers
export { initTRPC } from '@trpc/server';
export type { CreateTRPCContext } from './context.js';
export { router, publicProcedure, protectedProcedure, adminProcedure } from './trpc.js';
