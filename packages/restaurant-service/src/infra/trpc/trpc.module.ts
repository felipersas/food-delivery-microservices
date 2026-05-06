import { Global, Module } from '@nestjs/common';
import { TRPCModule } from 'nestjs-trpc';
import { RestaurantRouter } from './restaurant.router';
import { GetMenuItemUseCase } from '../../application/use-cases/get-menu-item/get-menu-item.use-case';
import { ListMenuItemsUseCase } from '../../application/use-cases/list-menu-items/list-menu-items.use-case';

/**
 * tRPC Module for Restaurant Service
 *
 * This module sets up the tRPC server using nestjs-trpc adapter.
 * Exposes RestaurantRouter procedures to other microservices.
 *
 * Architecture:
 * - Decorator-based router with @Router(), @Query(), @Mutation()
 * - Auto-registers procedures with tRPC
 * - Full NestJS dependency injection support
 *
 * Usage:
 * - Import TrpcModule in AppModule
 * - Other services use tRPC client to call procedures
 * - Full type safety with auto-completion
 */
@Global()
@Module({
  imports: [
    TRPCModule.forRoot(),
  ],
  providers: [
    RestaurantRouter,
    GetMenuItemUseCase,
    ListMenuItemsUseCase,
  ],
  exports: [
    TRPCModule,
    RestaurantRouter,
  ],
})
export class TrpcModule {}
