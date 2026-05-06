import { Inject, Injectable } from '@nestjs/common';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import type { ListRestaurantsInput } from './list-restaurants.dto';
import type { GetRestaurantOutput } from '../get-restaurant/get-restaurant.dto';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';
import { RESTAURANT_REPOSITORY } from '../../../tokens';

@Injectable()
export class ListRestaurantsUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY) private readonly restaurantRepository: RestaurantRepository,
  ) {}

  async execute(input: ListRestaurantsInput): Promise<GetRestaurantOutput[]> {
    let restaurants: Restaurant[];

    // Filter by owner
    if (input.ownerId) {
      restaurants = await this.restaurantRepository.findByOwnerId(input.ownerId);
    }
    // Nearby search
    else if (input.lat !== undefined && input.lng !== undefined) {
      const radiusKm = input.radiusKm ?? 5;
      restaurants = await this.restaurantRepository.findNearby(
        input.lat,
        input.lng,
        radiusKm,
      );
    }
    // Name search
    else if (input.search) {
      restaurants = await this.restaurantRepository.findByName(input.search);
    }
    // Get active only
    else if (input.status === 'active') {
      restaurants = await this.restaurantRepository.findActive();
    }
    // Get all (for now - in production would add pagination)
    else {
      restaurants = await this.restaurantRepository.findActive();
    }

    // Map to output
    return restaurants.map((r) => this.mapToOutput(r));
  }

  private mapToOutput(restaurant: Restaurant): GetRestaurantOutput {
    const address = restaurant.getAddress();
    
    return {
      id: restaurant.getId(),
      ownerId: restaurant.getOwnerId(),
      name: restaurant.getName(),
      description: restaurant.getDescription(),
      address: {
        street: address.street,
        number: address.number,
        complement: address.complement,
        neighborhood: address.neighborhood,
        city: address.city,
        state: address.state,
        zipCode: address.zipCode,
        latitude: address.latitude,
        longitude: address.longitude,
      },
      phone: restaurant.getPhone(),
      email: restaurant.getEmail(),
      operatingHours: restaurant.getOperatingHours().map((oh: OperatingHours) => ({
        dayOfWeek: oh.dayOfWeek,
        dayName: oh.getDayName(),
        openTime: oh.openTime,
        closeTime: oh.closeTime,
      })),
      status: restaurant.getStatus(),
      averageRating: restaurant.getAverageRating(),
      totalRatings: restaurant.getTotalRatings(),
      deliveryFeeCents: restaurant.getDeliveryFeeCents(),
      minOrderCents: restaurant.getMinOrderCents(),
      estimatedPrepTimeMinutes: restaurant.getEstimatedPrepTimeMinutes(),
      isOpenNow: restaurant.isOpenNow(),
      createdAt: restaurant.getCreatedAt(),
      updatedAt: restaurant.getUpdatedAt(),
    };
  }
}
