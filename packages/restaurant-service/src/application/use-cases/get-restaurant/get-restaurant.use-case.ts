import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import type { GetRestaurantOutput } from './get-restaurant.dto';
import { RESTAURANT_REPOSITORY } from '../../../tokens';

@Injectable()
export class GetRestaurantUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY) private readonly restaurantRepository: RestaurantRepository,
  ) {}

  async execute(id: string): Promise<GetRestaurantOutput | null> {
    const restaurant = await this.restaurantRepository.findById(id);
    
    if (!restaurant) {
      throw new NotFoundException(`Restaurant ${id} not found`);
    }

    return this.mapToOutput(restaurant);
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
      operatingHours: restaurant.getOperatingHours().map((oh) => ({
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
