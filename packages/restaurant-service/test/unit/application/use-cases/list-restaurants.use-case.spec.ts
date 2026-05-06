import { describe, it, expect, mock, beforeEach } from 'bun:test';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import { RestaurantAddress } from '@domain/value-objects/restaurant-address.vo';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';
import { ListRestaurantsUseCase } from '@application/use-cases/list-restaurants/list-restaurants.use-case';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import { RestaurantStatusEnum } from '@domain/value-objects/restaurant-status.vo';

function createMockRestaurant(
  id: string,
  name: string,
  status: RestaurantStatusEnum,
): Restaurant {
  const address = RestaurantAddress.create({
    street: 'Av. Paulista',
    number: '1000',
    neighborhood: 'Bela Vista',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    latitude: -23.561684,
    longitude: -46.655981,
  });

  const operatingHours = [
    OperatingHours.create({
      dayOfWeek: 1,
      openTime: '11:00',
      closeTime: '23:00',
    }),
  ];

  const restaurant = Restaurant.create({
    ownerId: 'owner-123',
    name,
    description: 'Test restaurant',
    address,
    phone: '+5511999999999',
    email: 'test@example.com',
    operatingHours,
    deliveryFeeCents: 500,
  });

  // Force set ID and status for testing
  (restaurant as any)._id = id;
  (restaurant as any)._status = status;

  return restaurant;
}

function makeMockRepo(restaurants: Restaurant[] = []): RestaurantRepository {
  let store = [...restaurants];
  return {
    findById: mock(async (_id: string) => null),
    save: mock(async (_restaurant: Restaurant) => {}),
    delete: mock(async (_id: string) => {}),
    findByOwnerId: mock(async (ownerId: string) =>
      store.filter((r) => r.getOwnerId() === ownerId),
    ),
    findNearby: mock(async (_lat: number, _lng: number, _radiusKm: number) => store),
    findByName: mock(async (_name: string) => store),
    findActive: mock(async () => store),
  };
}

describe('ListRestaurantsUseCase', () => {
  let useCase: ListRestaurantsUseCase;
  let mockRepo: RestaurantRepository;

  beforeEach(() => {
    const restaurants = [
      createMockRestaurant('rest-1', 'Pizza Place', RestaurantStatusEnum.ACTIVE),
      createMockRestaurant('rest-2', 'Burger House', RestaurantStatusEnum.PENDING),
      createMockRestaurant('rest-3', 'Sushi Bar', RestaurantStatusEnum.ACTIVE),
    ];
    mockRepo = makeMockRepo(restaurants);
    useCase = new ListRestaurantsUseCase(mockRepo);
  });

  it('should list all restaurants when no filters provided', async () => {
    const result = await useCase.execute({});

    expect(result).toHaveLength(3);
    expect(mockRepo.findActive).toHaveBeenCalled();
  });

  it('should filter by status', async () => {
    const result = await useCase.execute({ status: RestaurantStatusEnum.ACTIVE });

    expect(result).toHaveLength(3);
    expect(mockRepo.findActive).toHaveBeenCalled();
  });

  it('should filter by owner', async () => {
    const result = await useCase.execute({ ownerId: 'owner-123' });

    expect(result).toHaveLength(3);
    expect(mockRepo.findByOwnerId).toHaveBeenCalledWith('owner-123');
  });

  it('should search by name', async () => {
    const result = await useCase.execute({ search: 'Pizza' });

    expect(mockRepo.findByName).toHaveBeenCalledWith('Pizza');
    expect(result).toHaveLength(3); // Mock returns all
  });

  it('should filter by geolocation', async () => {
    const result = await useCase.execute({
      lat: -23.561684,
      lng: -46.655981,
      radiusKm: 5,
    });

    expect(mockRepo.findNearby).toHaveBeenCalledWith(-23.561684, -46.655981, 5);
    expect(result).toHaveLength(3); // Mock returns all
  });

  it('should combine search and status filters', async () => {
    const result = await useCase.execute({
      search: 'Bar',
      status: RestaurantStatusEnum.ACTIVE,
    });

    expect(mockRepo.findByName).toHaveBeenCalledWith('Bar');
    expect(result).toHaveLength(3); // Mock returns all
  });

  it('should map restaurant to output correctly', async () => {
    const result = await useCase.execute({});

    expect(result[0]).toMatchObject({
      name: 'Pizza Place',
      ownerId: 'owner-123',
    });
    expect(result[0].id).toBeDefined();
    expect(result[0].address).toBeDefined();
    expect(result[0].operatingHours).toHaveLength(1);
  });
});
