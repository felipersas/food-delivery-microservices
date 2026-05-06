import { Inject, Injectable } from '@nestjs/common';
import type { OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Money, ResourceNotFoundException, DomainException } from '@app/shared';
import type { RestaurantServiceClient } from '../../infra/trpc/restaurant-service.client';
import { RESTAURANT_SERVICE_CLIENT } from '../../../tokens';
import { REDIS_CLIENT } from '../../config/redis.config';

interface CachedMenuItem {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  restaurantId: string;
  cachedAt: string;
}

/**
 * Price Cache Service
 * 
 * Provides a caching layer for menu item prices with:
 * - Redis cache-aside pattern with 5-minute TTL
 * - tRPC client for type-safe inter-service communication
 * - Batch fetching support for cart views
 * - Event-driven cache invalidation
 * 
 * Architecture:
 * 1. Check Redis cache first (fast path)
 * 2. Cache miss: call Restaurant Service via tRPC
 * 3. Store in Redis with TTL for next access
 * 4. Invalidate cache on price update events
 */
@Injectable()
export class PriceCacheService implements OnModuleDestroy {
  private readonly CACHE_TTL_SECONDS: number;
  private readonly PRICE_KEY_PREFIX = 'menu-item:';

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(RESTAURANT_SERVICE_CLIENT) private readonly restaurantClient: RestaurantServiceClient,
    private readonly configService: ConfigService,
  ) {
    this.CACHE_TTL_SECONDS = this.configService.get('REDIS_CACHE_TTL_SECONDS', 300);
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Get current price from cache or fetch from Restaurant Service
   * Uses cache-aside pattern for optimal performance
   */
  async getItemPrice(itemId: string): Promise<{ price: Money; available: boolean; name: string }> {
    // Try cache first
    const cached = await this.getFromCache(itemId);
    if (cached) {
      return {
        price: Money.BRLFromCents(cached.priceCents),
        available: cached.available,
        name: cached.name,
      };
    }

    // Cache miss - fetch from Restaurant Service via tRPC
    const item = await this.fetchFromService(itemId);
    await this.setToCache(item);

    return {
      price: Money.BRLFromCents(item.priceCents),
      available: item.available,
      name: item.name,
    };
  }

  /**
   * Batch fetch prices for multiple items (optimization for cart view)
   * Uses Redis pipeline for efficient multi-get
   */
  async getItemPrices(itemIds: string[]): Promise<Map<string, { price: Money; available: boolean; name: string }>> {
    const result = new Map<string, { price: Money; available: boolean; name: string }>();
    const missingIds: string[] = [];

    // Try to get all from cache (pipeline for performance)
    const pipeline = this.redis.pipeline();
    for (const id of itemIds) {
      pipeline.get(this.PRICE_KEY_PREFIX + id);
    }
    const cachedResults = await pipeline.exec();

    // Process cached results
    if (!cachedResults) {
      return new Map();
    }

    for (let i = 0; i < itemIds.length; i++) {
      const id = itemIds[i];
      const [err, value] = cachedResults[i];

      if (value && !err) {
        const item = JSON.parse(value as string) as CachedMenuItem;
        result.set(id, {
          price: Money.BRLFromCents(item.priceCents),
          available: item.available,
          name: item.name,
        });
      } else {
        missingIds.push(id);
      }
    }

    // Fetch missing items via tRPC (could be batched in future)
    if (missingIds.length > 0) {
      for (const id of missingIds) {
        const item = await this.fetchFromService(id);
        await this.setToCache(item);
        result.set(id, {
          price: Money.BRLFromCents(item.priceCents),
          available: item.available,
          name: item.name,
        });
      }
    }

    return result;
  }

  /**
   * Invalidate cache entry (called when price changes)
   * Triggered by PriceChangeConsumer on price.updated events
   */
  async invalidateItem(itemId: string): Promise<void> {
    await this.redis.del(this.PRICE_KEY_PREFIX + itemId);
  }

  /**
   * Warm up cache with frequently accessed items
   * Useful for pre-loading popular restaurant menus
   */
  async warmCache(restaurantId: string): Promise<void> {
    const items = await this.fetchMenuItems(restaurantId);

    const pipeline = this.redis.pipeline();
    for (const item of items) {
      pipeline.set(
        this.PRICE_KEY_PREFIX + item.id,
        JSON.stringify(item),
        'EX',
        this.CACHE_TTL_SECONDS,
      );
    }
    await pipeline.exec();
  }

  private async getFromCache(itemId: string): Promise<CachedMenuItem | null> {
    const value = await this.redis.get(this.PRICE_KEY_PREFIX + itemId);
    return value ? JSON.parse(value) : null;
  }

  private async setToCache(item: CachedMenuItem): Promise<void> {
    await this.redis.set(
      this.PRICE_KEY_PREFIX + item.id,
      JSON.stringify({ ...item, cachedAt: new Date().toISOString() }),
      'EX',
      this.CACHE_TTL_SECONDS,
    );
  }

  /**
   * Fetch a single menu item from Restaurant Service via tRPC
   * Type-safe call with full IDE support
   */
  private async fetchFromService(itemId: string): Promise<CachedMenuItem> {
    try {
      const menuItem = await this.restaurantClient.restaurant.getMenuItem.query({ id: itemId });

      return {
        id: menuItem.id,
        name: menuItem.name,
        priceCents: menuItem.priceCents,
        available: menuItem.available,
        restaurantId: menuItem.restaurantId,
        cachedAt: new Date().toISOString(),
      };
    } catch (error) {
      // Handle tRPC errors
      if (error instanceof Error && error.message.includes('NOT_FOUND')) {
        throw new ResourceNotFoundException('MenuItem', itemId);
      }
      throw new DomainException('Failed to fetch menu item from Restaurant Service');
    }
  }

  /**
   * Fetch all menu items for a restaurant via tRPC
   * Used for cache warming and bulk operations
   */
  private async fetchMenuItems(restaurantId: string): Promise<CachedMenuItem[]> {
    try {
      const menuItems = await this.restaurantClient.restaurant.getMenuItems.query({ restaurantId });

      const now = new Date().toISOString();
      return menuItems.map((item) => ({
        id: item.id,
        name: item.name,
        priceCents: item.priceCents,
        available: item.available,
        restaurantId: item.restaurantId,
        cachedAt: now,
      }));
    } catch (error) {
      throw new DomainException('Failed to fetch menu items from Restaurant Service');
    }
  }
}
