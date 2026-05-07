import { Global, Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc';

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
 */
@Global()
@Module({
  imports: [
    TRPCModule.forRoot(),
  ],
  exports: [
    TRPCModule,
  ],
})
export class TrpcModule {}
