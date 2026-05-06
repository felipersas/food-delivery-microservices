import { describe, it, expect } from 'bun:test';
import { RestaurantAddress } from '@domain/value-objects/restaurant-address.vo';

describe('RestaurantAddress', () => {
  describe('create', () => {
    it('should create a valid address', () => {
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

      expect(address.street).toBe('Av. Paulista');
      expect(address.number).toBe('1000');
      expect(address.neighborhood).toBe('Bela Vista');
      expect(address.city).toBe('São Paulo');
      expect(address.state).toBe('SP');
      expect(address.zipCode).toBe('01310-100');
      expect(address.latitude).toBe(-23.561684);
      expect(address.longitude).toBe(-46.655981);
    });

    it('should create address with complement', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        complement: 'Apto 101',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(address.complement).toBe('Apto 101');
    });

    it('should throw error when street is empty', () => {
      expect(() =>
        RestaurantAddress.create({
          street: '',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        }),
      ).toThrow('Street is required');
    });

    it('should throw error when number is empty', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        }),
      ).toThrow('Number is required');
    });

    it('should throw error when neighborhood is empty', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: '',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
        }),
      ).toThrow('Neighborhood is required');
    });

    it('should throw error when city is empty', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: '',
          state: 'SP',
          zipCode: '01310-100',
        }),
      ).toThrow('City is required');
    });

    it('should throw error when state is not 2 characters', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'S',
          zipCode: '01310-100',
        }),
      ).toThrow('State must be 2 characters');
    });

    it('should throw error when zip code is empty', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '',
        }),
      ).toThrow('Invalid Brazilian zip code format');
    });

    it('should throw error when zip code format is invalid', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '12345-6789',
        }),
      ).toThrow('Invalid Brazilian zip code format');
    });

    it('should throw error when zip code has no dash', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310100',
        }),
      ).toThrow('Invalid Brazilian zip code format');
    });

    it('should throw error when latitude is out of range', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          latitude: -91,
        }),
      ).toThrow('Latitude must be between -90 and 90');
    });

    it('should throw error when longitude is out of range', () => {
      expect(() =>
        RestaurantAddress.create({
          street: 'Av. Paulista',
          number: '1000',
          neighborhood: 'Bela Vista',
          city: 'São Paulo',
          state: 'SP',
          zipCode: '01310-100',
          longitude: 181,
        }),
      ).toThrow('Longitude must be between -180 and 180');
    });

    it('should allow address without coordinates', () => {
      const address = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(address.latitude).toBeUndefined();
      expect(address.longitude).toBeUndefined();
    });
  });

  describe('equals', () => {
    it('should return true for addresses with same values', () => {
      const address1 = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const address2 = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(address1.equals(address2)).toBe(true);
    });

    it('should return false for addresses with different values', () => {
      const address1 = RestaurantAddress.create({
        street: 'Av. Paulista',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      const address2 = RestaurantAddress.create({
        street: 'Av. Brigadeiro',
        number: '1000',
        neighborhood: 'Bela Vista',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(address1.equals(address2)).toBe(false);
    });
  });
});
