import { describe, it, expect } from 'bun:test';
import { CustomerAddress } from '@domain/value-objects/customer-address.vo';

describe('CustomerAddress Value Object', () => {
  const validProps = {
    street: 'Av Paulista',
    number: '1000',
    complement: 'Apt 101',
    city: 'São Paulo',
    state: 'SP',
    zipCode: '01310-100',
    isDefault: false,
  };

  describe('create', () => {
    it('should create valid address', () => {
      const address = CustomerAddress.create(validProps);

      expect(address.street).toBe('Av Paulista');
      expect(address.number).toBe('1000');
      expect(address.complement).toBe('Apt 101');
      expect(address.city).toBe('São Paulo');
      expect(address.state).toBe('SP');
      expect(address.zipCode).toBe('01310-100');
      expect(address.isDefault).toBe(false);
    });

    it('should create address without complement', () => {
      const props = { ...validProps, complement: undefined };
      const address = CustomerAddress.create(props);

      expect(address.complement).toBeUndefined();
    });

    it('should throw on empty street', () => {
      const props = { ...validProps, street: '' };
      expect(() => CustomerAddress.create(props)).toThrow('Street is required');
    });

    it('should throw on empty number', () => {
      const props = { ...validProps, number: '' };
      expect(() => CustomerAddress.create(props)).toThrow('Number is required');
    });

    it('should throw on empty city', () => {
      const props = { ...validProps, city: '' };
      expect(() => CustomerAddress.create(props)).toThrow('City is required');
    });

    it('should throw on invalid state (not 2 chars)', () => {
      const props = { ...validProps, state: 'S' };
      expect(() => CustomerAddress.create(props)).toThrow('State must be 2 characters');
    });

    it('should throw on invalid zip code format', () => {
      const props = { ...validProps, zipCode: '12345678' };
      expect(() => CustomerAddress.create(props)).toThrow('Invalid Brazilian zip code');
    });
  });

  describe('makeDefault', () => {
    it('should set address as default', () => {
      const address = CustomerAddress.create({ ...validProps, isDefault: false });
      const defaultAddress = address.makeDefault();

      expect(defaultAddress.isDefault).toBe(true);
    });

    it('should create new instance', () => {
      const address = CustomerAddress.create(validProps);
      const defaultAddress = address.makeDefault();

      expect(defaultAddress).not.toBe(address);
    });
  });

  describe('removeDefault', () => {
    it('should remove default flag', () => {
      const address = CustomerAddress.create({ ...validProps, isDefault: true });
      const notDefault = address.removeDefault();

      expect(notDefault.isDefault).toBe(false);
    });

    it('should create new instance', () => {
      const address = CustomerAddress.create(validProps);
      const notDefault = address.removeDefault();

      expect(notDefault).not.toBe(address);
    });
  });
});
