import { describe, it, expect, mock } from 'bun:test';
import type { DomainEvent } from '@app/shared';
import { CreateRestaurantUseCase } from '@application/use-cases/create-restaurant/create-restaurant.use-case';
import type { RestaurantRepository } from '@domain/repositories/restaurant.repository.interface';
import type { CreateRestaurantInput } from '@application/use-cases/create-restaurant/create-restaurant.dto';

function makeMockRepo(): RestaurantRepository {
  const store = new Map();
  return {
    findById: mock(async (id: string) => store.get(id) ?? null),
    save: mock(async (restaurant: any) => {
      store.set(restaurant.getId(), restaurant);
      return restaurant;
    }),
    delete: mock(async (id: string) => {
      store.delete(id);
    }),
    findAll: mock(async () => Array.from(store.values())),
    findByOwnerId: mock(async (ownerId: string) =>
      Array.from(store.values()).filter((r: any) => r.getOwnerId() === ownerId),
    ),
    findNearby: mock(async (_lat: number, _lng: number, _radiusKm: number) =>
      Array.from(store.values()),
    ),
    searchByName: mock(async (_name: string) => Array.from(store.values())),
  };
}

function makeMockPublisher() {
  return {
    publishAll: mock(async (_events: ReadonlyArray<DomainEvent>) => {}),
  };
}

describe('CreateRestaurantUseCase', () => {
  it('should create a restaurant and persist it', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateRestaurantUseCase(repo, publisher);

    const input: CreateRestaurantInput = {
      ownerId: 'owner-1',
      name: 'Pizza Place',
      description: 'Best pizza in town',
      address: {
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
        latitude: -23.561684,
        longitude: -46.655981,
      },
      phone: '+5511999999999',
      email: 'contact@pizzaplace.com',
      operatingHours: [
        {
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        },
      ],
      deliveryFeeCents: 500,
      minOrderCents: 2000,
      estimatedPrepTimeMinutes: 30,
    };

    const result = await useCase.execute(input);

    expect(result).toBeDefined();
    expect(result.restaurantId).toBeDefined();
    expect(result.name).toBe('Pizza Place');
    expect(result.status).toBe('pending');
    expect(repo.save).toHaveBeenCalled();
    expect(publisher.publishAll).toHaveBeenCalled();
  });

  it('should publish domain events', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateRestaurantUseCase(repo, publisher);

    const input: CreateRestaurantInput = {
      ownerId: 'owner-1',
      name: 'Pizza Place',
      description: 'Best pizza in town',
      address: {
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
      phone: '+5511999999999',
      email: 'contact@pizzaplace.com',
      operatingHours: [
        {
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        },
      ],
    };

    await useCase.execute(input);

    expect(publisher.publishAll).toHaveBeenCalledTimes(1);
    const events = (publisher.publishAll as any).mock.calls[0][0] as DomainEvent[];
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('restaurant.created');
  });

  it('should throw error when validation fails', async () => {
    const repo = makeMockRepo();
    const publisher = makeMockPublisher();
    const useCase = new CreateRestaurantUseCase(repo, publisher);

    const input: CreateRestaurantInput = {
      ownerId: 'owner-1',
      name: '', // Invalid: empty name
      description: 'Best pizza in town',
      address: {
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      },
      phone: '+5511999999999',
      email: 'contact@pizzaplace.com',
      operatingHours: [
        {
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        },
      ],
    };

    await expect(useCase.execute(input)).rejects.toThrow('Name is required');
  });
});
