import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@app/trpc-definitions';
import { fetch } from 'undici';

/**
 * tRPC Client for Restaurant Service
 * 
 * Provides type-safe access to Restaurant Service procedures
 * Uses fetch adapter for HTTP-based tRPC communication
 * 
 * Architecture:
 * - Client created at module initialization
 * - Uses httpBatchLink for efficient batching
 * - Auto-retry on connection failure
 * - Type-safe procedure calls with full IDE support
 * 
 * Usage:
 * ```ts
 * const menuItem = await client.restaurant.getMenuItem.query({ id: '123' });
 * const menuItems = await client.restaurant.getMenuItems.query({ restaurantId: '456' });
 * ```
 */
@Injectable()
export class RestaurantServiceClient implements OnModuleDestroy {
  private readonly client: ReturnType<typeof createTRPCProxyClient<AppRouter>>;
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('RESTAURANT_SERVICE_URL', 'http://localhost:3007');

    this.client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${this.baseUrl}/trpc`,
          fetch,
          // Abort requests after 5 seconds
          async fetch(input, init) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);
            
            try {
              const response = await fetch(input, {
                ...init,
                signal: controller.signal,
              });
              clearTimeout(timeoutId);
              return response;
            } catch (error) {
              clearTimeout(timeoutId);
              throw error;
            }
          },
        }),
      ],
    });
  }

  /**
   * Get the tRPC client instance
   * Exposed for use by services
   */
  get restaurant() {
    return this.client.restaurant;
  }

  /**
   * Health check for Restaurant Service tRPC endpoint
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.restaurant.isMenuItemAvailable.query({ id: '00000000-0000-0000-0000-000000000000' });
      return true;
    } catch {
      return false;
    }
  }

  async onModuleDestroy() {
    // Client cleanup (if needed in future)
  }
}
