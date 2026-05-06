import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RestaurantServiceClient } from './restaurant-service.client.js';

/**
 * Restaurant Service Client Module
 * 
 * Provides the tRPC client for calling Restaurant Service procedures
 * Singleton client instance shared across the cart service
 */
@Module({
  providers: [
    {
      provide: RestaurantServiceClient,
      useFactory: (configService: ConfigService) => new RestaurantServiceClient(configService),
      inject: [ConfigService],
    },
  ],
  exports: [RestaurantServiceClient],
})
export class RestaurantServiceClientModule {}
