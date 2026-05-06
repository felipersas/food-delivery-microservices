import { Module, Global } from '@nestjs/common';
import { createTRPCContext, appRouter } from '@app/trpc-definitions';
import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { RestaurantTrpcServer } from './restaurant.trpc.server.js';
import { GetMenuItemUseCase } from '../../application/use-cases/get-menu-item/get-menu-item.use-case';
import { ListMenuItemsUseCase } from '../../application/use-cases/list-menu-items/list-menu-items.use-case';

/**
 * tRPC Module for Restaurant Service
 * 
 * This module sets up the tRPC server that exposes Restaurant Service
 * procedures to other microservices via type-safe inter-service communication.
 * 
 * Architecture:
 * - Uses fetch adapter for HTTP-based tRPC (ideal for microservices)
 * - Procedures are implemented by RestaurantTrpcServer
 * - Handler can be mounted as a NestJS controller or standalone endpoint
 * 
 * Usage:
 * - Mount the tRPC handler at /trpc path
 * - Other services use tRPC client to call procedures
 * - Full type safety with auto-completion
 */
@Global()
@Module({
  providers: [
    {
      provide: 'TRPC_CONTEXT_FACTORY',
      useFactory: (trpcServer: RestaurantTrpcServer) => trpcServer.createContext,
      inject: [RestaurantTrpcServer],
    },
    {
      provide: 'TRPC_HANDLER',
      useFactory: () => {
        return fetchRequestHandler({
          router: appRouter,
          createContext: () => ({}),
        });
      },
    },
    RestaurantTrpcServer,
    GetMenuItemUseCase,
    ListMenuItemsUseCase,
  ],
  exports: ['TRPC_CONTEXT_FACTORY', 'TRPC_HANDLER', RestaurantTrpcServer],
})
export class TrpcModule {}
