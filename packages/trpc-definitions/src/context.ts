/**
 * tRPC context type for inter-service communication
 * Provides access to service dependencies within procedures
 */
export interface CreateTRPCContext {
  userId?: string;
  userRole?: string;
}

export type TRPCContext = CreateTRPCContext;
