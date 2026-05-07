import { initTRPC, TRPCError } from '@trpc/server';
import type { CreateTRPCContext } from './context';

/**
 * tRPC instance configuration
 * Context type is passed to all procedures
 */
const t = initTRPC.context<CreateTRPCContext>().create({
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        code: error.cause instanceof Error ? error.cause.message : error.code,
      },
    };
  },
});

/**
 * Export tRPC instance and utilities
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'You must be logged in',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

/**
 * Middleware for role-based access control
 */
const roleMiddleware = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userRole) {
    throw new TRPCError({
      code: 'FORBIDDEN',
      message: 'Insufficient permissions',
    });
  }
  return next({
    ctx: {
      ...ctx,
      userRole: ctx.userRole,
    },
  });
});

export const adminProcedure = publicProcedure.use(roleMiddleware);
