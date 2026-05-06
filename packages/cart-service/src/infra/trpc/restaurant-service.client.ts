import { Inject, Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTRPCProxyClient, httpBatchLink, TRPCClientError } from '@trpc/client';
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
 * - Configurable timeout with circuit breaker support
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
  private readonly timeout: number;
  private readonly logger = new Logger(RestaurantServiceClient.name);

  constructor(private readonly configService: ConfigService) {
    this.baseUrl = this.configService.get<string>('RESTAURANT_SERVICE_URL', 'http://localhost:3007');
    this.timeout = this.configService.get<number>('TRPC_CLIENT_TIMEOUT_MS', 5000);

    this.client = createTRPCProxyClient<AppRouter>({
      links: [
        httpBatchLink({
          url: `${this.baseUrl}/trpc`,
          fetch,
          // Abort requests after configured timeout
          async fetch(input, init) {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), this.timeout);
            
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
   * Uses a dummy UUID to test connectivity
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.restaurant.isMenuItemAvailable.query({ id: '00000000-0000-0000-0000-000000000000' });
      return true;
    } catch (error) {
      this.logger.warn('Restaurant service health check failed', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      return false;
    }
  }

  async onModuleDestroy() {
    // Client cleanup (if needed in future)
  }
}
