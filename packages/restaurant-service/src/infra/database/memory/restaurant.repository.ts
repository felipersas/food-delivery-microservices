import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import { RestaurantAddress } from '@domain/value-objects/restaurant-address.vo';
import { RestaurantStatus } from '@domain/value-objects/restaurant-status.vo';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';

export class InMemoryRestaurantRepository implements RestaurantRepository {
  private restaurants: Map<string, Restaurant> = new Map();

  async findById(id: string): Promise<Restaurant | null> {
    const restaurant = this.restaurants.get(id);
    return restaurant ?? null;
  }

  async save(aggregate: Restaurant): Promise<void> {
    this.restaurants.set(aggregate.getId(), aggregate);
  }

  async delete(id: string): Promise<void> {
    this.restaurants.delete(id);
  }

  async findByOwnerId(ownerId: string): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter(
      (r) => r.getOwnerId() === ownerId,
    );
  }

  async findActive(): Promise<Restaurant[]> {
    return Array.from(this.restaurants.values()).filter((r) =>
      r.getStatus() === 'active'
    );
  }

  async findNearby(
    latitude: number,
    longitude: number,
    radiusKm: number,
  ): Promise<Restaurant[]> {
    // Simple distance calculation (Haversine formula approximation)
    const toRad = (deg: number) => deg * (Math.PI / 180);
    
    return Array.from(this.restaurants.values()).filter((restaurant) => {
      const address = restaurant.getAddress();
      if (!address.hasLocation()) return false;
      
      const lat1 = toRad(latitude);
      const lat2 = toRad(address.latitude!);
      const lon1 = toRad(longitude);
      const lon2 = toRad(address.longitude!);
      
      const dLat = lat2 - lat1;
      const dLon = lon2 - lon1;
      
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
      
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = 6371 * c; // Earth's radius in km
      
      return distance <= radiusKm;
    });
  }

  async findByName(search: string): Promise<Restaurant[]> {
    const lowerSearch = search.toLowerCase();
    return Array.from(this.restaurants.values()).filter((r) =>
      r.getName().toLowerCase().includes(lowerSearch)
    );
  }

  clear(): void {
    this.restaurants.clear();
  }
}
