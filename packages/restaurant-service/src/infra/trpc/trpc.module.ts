import { Global, Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc';
import { TrpcContext } from './trpc.context';
import { TrpcErrorHandler } from './trpc.error-handler';

/**
 * tRPC Module for Restaurant Service
 *
 * This module sets up the tRPC server using nestjs-trpc adapter.
 * The RestaurantRouter is provided by RestaurantModule.
 *
 * Architecture:
 * - Decorator-based router with @Router(), @Query(), @Mutation()
 * - Auto-registers procedures with tRPC
 * - Full NestJS dependency injection support
 * - Context provides userId/userRole from request headers
 * - Centralized error handling with structured logging
 *
 * Usage:
 * - Import TrpcModule in AppModule
 * - Other services use tRPC client to call procedures
 * - Full type safety with auto-completion
 */
@Global()
@Module({
  imports: [
    TRPCModule.forRoot({
      basePath: '/trpc',
      context: TrpcContext,
      onError: TrpcErrorHandler,
    }),
  ],
  providers: [
    TrpcContext,
    TrpcErrorHandler,
  ],
  exports: [
    TRPCModule,
  ],
})
export class TrpcModule {}
