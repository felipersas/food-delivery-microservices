import { describe, it, expect } from 'bun:test';
import { KitchenTicketItem } from '../../../src/domain/value-objects/kitchen-ticket-item.vo';
import { DomainException } from '@app/shared';

describe('KitchenTicketItem Value Object', () => {
  describe('create', () => {
    it('should create a valid kitchen ticket item', () => {
      const item = KitchenTicketItem.create({
        productId: 'product-123',
        productName: 'X-Burger',
        quantity: 2,
      });

      expect(item.productId).toBe('product-123');
      expect(item.productName).toBe('X-Burger');
      expect(item.quantity).toBe(2);
    });

    it('should throw error when productId is empty', () => {
      expect(() => {
        KitchenTicketItem.create({
          productId: '',
          productName: 'X-Burger',
          quantity: 1,
        });
      }).toThrow(DomainException);
      expect(() => {
        KitchenTicketItem.create({
          productId: '',
          productName: 'X-Burger',
          quantity: 1,
        });
      }).toThrow('Product ID is required');
    });

    it('should throw error when productId is only whitespace', () => {
      expect(() => {
        KitchenTicketItem.create({
          productId: '   ',
          productName: 'X-Burger',
          quantity: 1,
        });
      }).toThrow('Product ID is required');
    });

    it('should throw error when productName is empty', () => {
      expect(() => {
        KitchenTicketItem.create({
          productId: 'product-123',
          productName: '',
          quantity: 1,
        });
      }).toThrow('Product name is required');
    });

    it('should throw error when productName is only whitespace', () => {
      expect(() => {
        KitchenTicketItem.create({
          productId: 'product-123',
          productName: '  ',
          quantity: 1,
        });
      }).toThrow('Product name is required');
    });

    it('should throw error when quantity is zero', () => {
      expect(() => {
        KitchenTicketItem.create({
          productId: 'product-123',
          productName: 'X-Burger',
          quantity: 0,
        });
      }).toThrow('Quantity must be positive');
    });

    it('should throw error when quantity is negative', () => {
      expect(() => {
        KitchenTicketItem.create({
          productId: 'product-123',
          productName: 'X-Burger',
          quantity: -1,
        });
      }).toThrow('Quantity must be positive');
    });

    it('should throw error when quantity exceeds 99', () => {
      expect(() => {
        KitchenTicketItem.create({
          productId: 'product-123',
          productName: 'X-Burger',
          quantity: 100,
        });
      }).toThrow('Quantity cannot exceed 99');
    });

    it('should accept quantity of 99 (maximum allowed)', () => {
      const item = KitchenTicketItem.create({
        productId: 'product-123',
        productName: 'X-Burger',
        quantity: 99,
      });

      expect(item.quantity).toBe(99);
    });

    it('should accept quantity of 1 (minimum allowed)', () => {
      const item = KitchenTicketItem.create({
        productId: 'product-123',
        productName: 'X-Burger',
        quantity: 1,
      });

      expect(item.quantity).toBe(1);
    });
  });

  describe('toPlain', () => {
    it('should convert to plain object', () => {
      const item = KitchenTicketItem.create({
        productId: 'product-123',
        productName: 'X-Burger',
        quantity: 3,
      });

      const plain = item.toPlain();

      expect(plain).toEqual({
        productId: 'product-123',
        productName: 'X-Burger',
        quantity: 3,
      });
    });
  });

  describe('immutability', () => {
    it('should be immutable via ValueObject base class', () => {
      const item = KitchenTicketItem.create({
        productId: 'product-123',
        productName: 'X-Burger',
        quantity: 2,
      });

      const plain = item.toPlain();

      // Attempting to modify the plain object should not affect the value object
      plain.productId = 'modified';
      plain.productName = 'Modified';
      plain.quantity = 999;

      expect(item.productId).toBe('product-123');
      expect(item.productName).toBe('X-Burger');
      expect(item.quantity).toBe(2);
    });
  });
});
