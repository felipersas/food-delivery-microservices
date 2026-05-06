import { describe, it, expect, beforeEach } from 'bun:test';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import { RestaurantAddress } from '@domain/value-objects/restaurant-address.vo';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';
import { InMemoryRestaurantRepository } from '@infra/database/memory/restaurant.repository';
import { RestaurantStatusEnum } from '@domain/value-objects/restaurant-status.vo';

describe('InMemoryRestaurantRepository', () => {
  let repository: InMemoryRestaurantRepository;

  beforeEach(() => {
    repository = new InMemoryRestaurantRepository();
  });

  function createRestaurant(name: string, status?: RestaurantStatusEnum): Restaurant {
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

    if (status === RestaurantStatusEnum.ACTIVE) {
      restaurant.activate();
      restaurant.clearDomainEvents();
    }

    return restaurant;
  }

  describe('save', () => {
    it('should save a new restaurant', async () => {
      const restaurant = createRestaurant('Pizza Place');

      await repository.save(restaurant);

      const found = await repository.findById(restaurant.getId());
      expect(found).not.toBeNull();
      expect(found?.getName()).toBe('Pizza Place');
    });

    it('should update an existing restaurant', async () => {
      const restaurant = createRestaurant('Pizza Place');
      await repository.save(restaurant);

      restaurant.updateProfile({ name: 'Pizza Palace' });
      await repository.save(restaurant);

      const found = await repository.findById(restaurant.getId());
      expect(found?.getName()).toBe('Pizza Palace');
    });
  });

  describe('findById', () => {
    it('should return restaurant when exists', async () => {
      const restaurant = createRestaurant('Pizza Place');
      await repository.save(restaurant);

      const found = await repository.findById(restaurant.getId());

      expect(found).not.toBeNull();
      expect(found?.getId()).toBe(restaurant.getId());
    });

    it('should return null when not exists', async () => {
      const found = await repository.findById('non-existent');

      expect(found).toBeNull();
    });
  });

  describe('findByOwnerId', () => {
    it('should return all restaurants for owner', async () => {
      const restaurant1 = createRestaurant('Pizza Place');
      const restaurant2 = createRestaurant('Burger House');

      await repository.save(restaurant1);
      await repository.save(restaurant2);

      const found = await repository.findByOwnerId('owner-123');

      expect(found).toHaveLength(2);
    });

    it('should return empty array when owner has no restaurants', async () => {
      const found = await repository.findByOwnerId('other-owner');

      expect(found).toEqual([]);
    });
  });

  describe('findNearby', () => {
    it('should return restaurants within radius', async () => {
      const restaurant = createRestaurant('Pizza Place');
      await repository.save(restaurant);

      // Near Av. Paulista
      const found = await repository.findNearby(-23.561684, -46.655981, 5);

      expect(found.length).toBeGreaterThan(0);
    });

    it('should return empty array when no restaurants nearby', async () => {
      const restaurant = createRestaurant('Pizza Place');
      await repository.save(restaurant);

      // Far away (different city)
      const found = await repository.findNearby(-22.9068, -43.1729, 5);

      expect(found).toEqual([]);
    });
  });

  describe('findByName', () => {
    it('should return restaurants matching name', async () => {
      const restaurant1 = createRestaurant('Pizza Place');
      const restaurant2 = createRestaurant('Burger House');

      await repository.save(restaurant1);
      await repository.save(restaurant2);

      const found = await repository.findByName('Pizza');

      expect(found).toHaveLength(1);
      expect(found[0].getName()).toBe('Pizza Place');
    });

    it('should be case insensitive', async () => {
      const restaurant = createRestaurant('Pizza Place');
      await repository.save(restaurant);

      const found = await repository.findByName('PIZZA');

      expect(found).toHaveLength(1);
    });

    it('should return empty array when no matches', async () => {
      const restaurant = createRestaurant('Pizza Place');
      await repository.save(restaurant);

      const found = await repository.findByName('Sushi');

      expect(found).toEqual([]);
    });
  });

  describe('findActive', () => {
    it('should return only active restaurants', async () => {
      const activeRestaurant = createRestaurant('Active Place', RestaurantStatusEnum.ACTIVE);
      const pendingRestaurant = createRestaurant('Pending Place');

      await repository.save(activeRestaurant);
      await repository.save(pendingRestaurant);

      const found = await repository.findActive();

      expect(found).toHaveLength(1);
      expect(found[0].getName()).toBe('Active Place');
    });

    it('should return empty array when no active restaurants', async () => {
      const restaurant = createRestaurant('Pending Place');
      await repository.save(restaurant);

      const found = await repository.findActive();

      expect(found).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete restaurant', async () => {
      const restaurant = createRestaurant('Pizza Place');
      await repository.save(restaurant);

      await repository.delete(restaurant.getId());

      const found = await repository.findById(restaurant.getId());
      expect(found).toBeNull();
    });
  });
});
