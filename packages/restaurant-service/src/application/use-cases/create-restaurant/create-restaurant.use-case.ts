import { Inject, Injectable } from '@nestjs/common';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import { RestaurantAddress } from '@domain/value-objects/restaurant-address.vo';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import type { EventPublisher } from '@infra/messaging/rabbitmq/restaurant-event.publisher';
import type { CreateRestaurantInput, CreateRestaurantOutput } from './create-restaurant.dto';
import { RESTAURANT_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class CreateRestaurantUseCase {
  constructor(
    @Inject(RESTAURANT_REPOSITORY) private readonly restaurantRepository: RestaurantRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreateRestaurantInput): Promise<CreateRestaurantOutput> {
    const address = RestaurantAddress.create({
      street: input.address.street,
      number: input.address.number,
      complement: input.address.complement,
      neighborhood: input.address.neighborhood,
      city: input.address.city,
      state: input.address.state,
      zipCode: input.address.zipCode,
      latitude: input.address.latitude,
      longitude: input.address.longitude,
    });

    const operatingHours = input.operatingHours.map((oh) =>
      OperatingHours.create({
        dayOfWeek: oh.dayOfWeek,
        openTime: oh.openTime,
        closeTime: oh.closeTime,
      }),
    );

    const restaurant = Restaurant.create({
      ownerId: input.ownerId,
      name: input.name,
      description: input.description,
      address,
      phone: input.phone,
      email: input.email,
      operatingHours,
      deliveryFeeCents: input.deliveryFeeCents,
      minOrderCents: input.minOrderCents,
      estimatedPrepTimeMinutes: input.estimatedPrepTimeMinutes,
    });

    await this.restaurantRepository.save(restaurant);

    const events = restaurant.getDomainEvents();
    await this.eventPublisher.publishAll(events);
    restaurant.clearDomainEvents();

    return {
      restaurantId: restaurant.getId(),
      name: restaurant.getName(),
      status: restaurant.getStatus(),
    };
  }
}
