import { Inject, Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { Money, ResourceNotFoundException, DomainException } from '@app/shared';
import { REDIS_CLIENT } from '../../config/redis.config';

interface CachedMenuItem {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  restaurantId: string;
  cachedAt: string;
}

@Injectable()
export class PriceCacheService implements OnModuleDestroy {
  private readonly CACHE_TTL_SECONDS: number;
  private readonly PRICE_KEY_PREFIX = 'menu-item:';
  private readonly RESTAURANT_SERVICE_URL: string;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly configService: ConfigService,
  ) {
    this.CACHE_TTL_SECONDS = this.configService.get('REDIS_CACHE_TTL_SECONDS', 300);
    this.RESTAURANT_SERVICE_URL = this.configService.get('RESTAURANT_SERVICE_URL', 'http://localhost:3007');
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Get current price from cache or fetch from Restaurant Service
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

    // Cache miss - fetch from Restaurant Service
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
    for (let i = 0; i < itemIds.length; i++) {
      const id = itemIds[i];
      const [err, value] = cachedResults![i];

      if (value && !err) {
        const item: CachedMenuItem = JSON.parse(value);
        result.set(id, {
          price: Money.BRLFromCents(item.priceCents),
          available: item.available,
          name: item.name,
        });
      } else {
        missingIds.push(id);
      }
    }

    // Fetch missing items
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
   */
  async invalidateItem(itemId: string): Promise<void> {
    await this.redis.del(this.PRICE_KEY_PREFIX + itemId);
  }

  /**
   * Warm up cache with frequently accessed items
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

  private async fetchFromService(itemId: string): Promise<CachedMenuItem> {
    const response = await fetch(`${this.RESTAURANT_SERVICE_URL}/menu-items/${itemId}`);

    if (response.status === 404) {
      throw new ResourceNotFoundException('MenuItem', itemId);
    }

    if (!response.ok) {
      throw new DomainException('Failed to fetch menu item');
    }

    return response.json();
  }

  private async fetchMenuItems(restaurantId: string): Promise<CachedMenuItem[]> {
    const response = await fetch(`${this.RESTAURANT_SERVICE_URL}/restaurants/${restaurantId}/menu-items`);
    if (!response.ok) throw new DomainException('Failed to fetch menu items');
    return response.json();
  }
}
