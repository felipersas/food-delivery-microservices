import type { Repository } from '@app/shared';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';

export interface RestaurantRepository extends Repository<Restaurant> {
  findByOwnerId(ownerId: string): Promise<Restaurant[]>;
  findActive(): Promise<Restaurant[]>;
  findNearby(latitude: number, longitude: number, radiusKm: number): Promise<Restaurant[]>;
  findByName(search: string): Promise<Restaurant[]>;
}
