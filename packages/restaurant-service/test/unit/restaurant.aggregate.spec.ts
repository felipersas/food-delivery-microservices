import { describe, it, expect, beforeEach } from 'bun:test';
import { Restaurant } from '@domain/aggregates/restaurant.aggregate';
import { RestaurantAddress } from '@domain/value-objects/restaurant-address.vo';
import { RestaurantStatusEnum } from '@domain/value-objects/restaurant-status.vo';
import { OperatingHours } from '@domain/value-objects/operating-hours.vo';

describe('Restaurant', () => {
  describe('create', () => {
    it('should create a valid restaurant', () => {
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
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
        deliveryFeeCents: 500,
        minOrderCents: 2000,
        estimatedPrepTimeMinutes: 30,
      });

      expect(restaurant.getId()).toBeDefined();
      expect(restaurant.getName()).toBe('Pizza Place');
      expect(restaurant.getStatus()).toBe(RestaurantStatusEnum.PENDING);
      expect(restaurant.getDeliveryFeeCents()).toBe(500);
      expect(restaurant.getMinOrderCents()).toBe(2000);
      expect(restaurant.getEstimatedPrepTimeMinutes()).toBe(30);
    });

    it('should emit restaurant.created event on creation', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
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
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
      });

      const events = restaurant.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('restaurant.created');
      expect(events[0].aggregateType).toBe('Restaurant');
    });

    it('should throw error when name is empty', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      expect(() =>
        Restaurant.create({
          ownerId: 'owner-123',
          name: '',
          description: 'Best pizza in town',
          address,
          phone: '+5511999999999',
          email: 'contact@pizzaplace.com',
          operatingHours,
        }),
      ).toThrow('Name is required');
    });

    it('should throw error when name exceeds 100 characters', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      expect(() =>
        Restaurant.create({
          ownerId: 'owner-123',
          name: 'A'.repeat(101),
          description: 'Best pizza in town',
          address,
          phone: '+5511999999999',
          email: 'contact@pizzaplace.com',
          operatingHours,
        }),
      ).toThrow('Name must be less than 100 characters');
    });

    it('should throw error when phone is invalid', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      expect(() =>
        Restaurant.create({
          ownerId: 'owner-123',
          name: 'Pizza Place',
          description: 'Best pizza in town',
          address,
          phone: 'invalid',
          email: 'contact@pizzaplace.com',
          operatingHours,
        }),
      ).toThrow('Invalid phone number format');
    });

    it('should throw error when email is invalid', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      expect(() =>
        Restaurant.create({
          ownerId: 'owner-123',
          name: 'Pizza Place',
          description: 'Best pizza in town',
          address,
          phone: '+5511999999999',
          email: 'invalid-email',
          operatingHours,
        }),
      ).toThrow('Invalid email format');
    });

    it('should throw error when no operating hours provided', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(() =>
        Restaurant.create({
          ownerId: 'owner-123',
          name: 'Pizza Place',
          description: 'Best pizza in town',
          address,
          phone: '+5511999999999',
          email: 'contact@pizzaplace.com',
          operatingHours: [],
        }),
      ).toThrow('At least one operating hour range is required');
    });
  });

  describe('activate', () => {
    let restaurant: Restaurant;

    beforeEach(() => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      restaurant = Restaurant.create({
        ownerId: 'owner-123',
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
      });
      restaurant.clearDomainEvents();
    });

    it('should activate a pending restaurant', () => {
      restaurant.activate();

      expect(restaurant.getStatus()).toBe(RestaurantStatusEnum.ACTIVE);
      const events = restaurant.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('restaurant.activated');
    });

    it('should allow activation from suspended state', () => {
      restaurant.activate(); // PENDING → ACTIVE
      restaurant.suspend(); // ACTIVE → SUSPENDED
      restaurant.clearDomainEvents();

      expect(() => restaurant.activate()).not.toThrow();
      expect(restaurant.getStatus()).toBe(RestaurantStatusEnum.ACTIVE);
    });
  });

  describe('suspend', () => {
    let restaurant: Restaurant;

    beforeEach(() => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      restaurant = Restaurant.create({
        ownerId: 'owner-123',
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
      });
      restaurant.activate();
      restaurant.clearDomainEvents();
    });

    it('should suspend an active restaurant', () => {
      restaurant.suspend('Temporary closure');

      expect(restaurant.getStatus()).toBe(RestaurantStatusEnum.SUSPENDED);
      const events = restaurant.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('restaurant.suspended');
    });
  });

  describe('updateProfile', () => {
    let restaurant: Restaurant;

    beforeEach(() => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      restaurant = Restaurant.create({
        ownerId: 'owner-123',
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
        deliveryFeeCents: 500,
      });
      restaurant.clearDomainEvents();
    });

    it('should update restaurant name', () => {
      restaurant.updateProfile({ name: 'Pizza Palace' });

      expect(restaurant.getName()).toBe('Pizza Palace');
    });

    it('should throw error when delivery fee is negative', () => {
      expect(() =>
        restaurant.updateProfile({ deliveryFeeCents: -100 }),
      ).toThrow('Delivery fee cannot be negative');
    });

    it('should throw error when estimated prep time is less than 1 minute', () => {
      expect(() =>
        restaurant.updateProfile({ estimatedPrepTimeMinutes: 0 }),
      ).toThrow('Estimated prep time must be at least 1 minute');
    });
  });

  describe('isOpenNow', () => {
    it('should return true when current time is within operating hours', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      // Monday 14:00 (within operating hours)
      const date = new Date('2026-05-04T14:00:00');

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1, // Monday
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      const restaurant = Restaurant.create({
        ownerId: 'owner-123',
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
      });

      // Mock Date constructor
      const mockDate = date;
      const originalDate = globalThis.Date;
      // @ts-ignore - mocking Date for testing
      globalThis.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockDate);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        static now() {
          return mockDate.getTime();
        }
      };

      expect(restaurant.isOpenNow()).toBe(true);

      globalThis.Date = originalDate;
    });

    it('should return false when current time is outside operating hours', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      // Monday 10:00 (before opening)
      const date = new Date('2026-05-04T10:00:00');

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1, // Monday
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      const restaurant = Restaurant.create({
        ownerId: 'owner-123',
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
      });

      // Mock Date constructor
      const mockDate = date;
      const originalDate = globalThis.Date;
      // @ts-ignore - mocking Date for testing
      globalThis.Date = class extends Date {
        constructor(...args: any[]) {
          if (args.length === 0) {
            super(mockDate);
          } else {
            // @ts-ignore
            super(...args);
          }
        }
        static now() {
          return mockDate.getTime();
        }
      };

      expect(restaurant.isOpenNow()).toBe(false);

      globalThis.Date = originalDate;
    });
  });

  describe('addRating', () => {
    let restaurant: Restaurant;

    beforeEach(() => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const operatingHours = [
        OperatingHours.create({
          dayOfWeek: 1,
          openTime: '11:00',
          closeTime: '23:00',
        }),
      ];

      restaurant = Restaurant.create({
        ownerId: 'owner-123',
        name: 'Pizza Place',
        description: 'Best pizza in town',
        address,
        phone: '+5511999999999',
        email: 'contact@pizzaplace.com',
        operatingHours,
      });
      restaurant.clearDomainEvents();
    });

    it('should add rating and update average', () => {
      restaurant.addRating(5);

      expect(restaurant.getTotalRatings()).toBe(1);
      expect(restaurant.getAverageRating()).toBe(5);
    });

    it('should calculate average correctly with multiple ratings', () => {
      restaurant.addRating(5);
      restaurant.addRating(4);
      restaurant.addRating(5);

      expect(restaurant.getTotalRatings()).toBe(3);
      expect(restaurant.getAverageRating()).toBeCloseTo(4.67, 2); // (5 + 4 + 5) / 3 ≈ 4.67
    });

    it('should throw error when rating is out of range', () => {
      expect(() => restaurant.addRating(0)).toThrow('Rating must be between 1 and 5');
      expect(() => restaurant.addRating(6)).toThrow('Rating must be between 1 and 5');
    });
  });
});
