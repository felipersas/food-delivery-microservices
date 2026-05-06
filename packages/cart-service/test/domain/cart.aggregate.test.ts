import { describe, test, expect } from 'bun:test';
import { Cart } from '../../src/domain/aggregates/cart.aggregate';
import { CartItem } from '../../src/domain/value-objects/cart-item.vo';
import { CartStatusEnum } from '../../src/domain/value-objects/cart-status.vo';
import { Money } from '@app/shared';
import {
  DomainException,
  InvalidStateException,
  ResourceNotFoundException,
} from '@app/shared';

describe('Cart Aggregate', () => {
  describe('Factory: create()', () => {
    test('should create cart with active status and no items', () => {
      const customerId = 'customer-123';
      const cart = Cart.create(customerId);

      expect(cart.getId()).toBeDefined();
      expect(cart.getCustomerId()).toBe(customerId);
      expect(cart.getRestaurantId()).toBeNull();
      expect(cart.getItems()).toEqual([]);
      expect(cart.getTotalAmount()).toEqual(Money.BRL(0));
      expect(cart.getStatus()).toBe(CartStatusEnum.ACTIVE);
      expect(cart.getCreatedAt()).toBeInstanceOf(Date);
      expect(cart.getUpdatedAt()).toBeInstanceOf(Date);
    });

    test('should emit cart.created event', () => {
      const customerId = 'customer-123';
      const cart = Cart.create(customerId);

      const events = cart.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('cart.created');
      expect(events[0].aggregateType).toBe('Cart');
      expect(events[0].data.cartId).toBe(cart.getId());
      expect(events[0].data.customerId).toBe(customerId);
    });
  });

  describe('Factory: reconstitute()', () => {
    test('should reconstitute cart from persistence', () => {
      const props = {
        id: 'cart-123',
        customerId: 'customer-123',
        restaurantId: 'restaurant-123',
        items: [
          {
            productId: 'item-1',
            productName: 'Burger',
            quantity: 2,
            unitPriceCents: 2500,
            restaurantId: 'restaurant-123',
          },
        ],
        status: CartStatusEnum.ACTIVE,
        totalAmountCents: 5000,
        version: 3,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      };

      const cart = Cart.reconstitute(props);

      expect(cart.getId()).toBe('cart-123');
      expect(cart.getCustomerId()).toBe('customer-123');
      expect(cart.getRestaurantId()).toBe('restaurant-123');
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getItems()[0].productId).toBe('item-1');
      expect(cart.getTotalAmount().cents).toBe(5000);
      expect(cart.getVersion()).toBe(3);
    });

    test('should reconstitute with correct version', () => {
      const props = {
        id: 'cart-123',
        customerId: 'customer-123',
        restaurantId: null,
        items: [],
        status: CartStatusEnum.ACTIVE,
        totalAmountCents: 0,
        version: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const cart = Cart.reconstitute(props);
      expect(cart.getVersion()).toBe(5);
    });
  });

  describe('addItem()', () => {
    test('should add item to empty cart', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });

      cart.addItem(item);

      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getRestaurantId()).toBe('restaurant-123');
      expect(cart.getTotalAmount()).toEqual(Money.BRL(25));
      expect(cart.getVersion()).toBe(1);
    });

    test('should set restaurantId when adding first item', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });

      cart.addItem(item);

      expect(cart.getRestaurantId()).toBe('restaurant-123');
    });

    test('should update quantity when item already exists', () => {
      const cart = Cart.create('customer-123');
      const item1 = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 2,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      const item2 = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });

      cart.addItem(item1);
      cart.addItem(item2);

      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getItems()[0].quantity).toBe(3);
      expect(cart.getTotalAmount()).toEqual(Money.BRL(75));
    });

    test('should reject item from different restaurant', () => {
      const cart = Cart.create('customer-123');
      const item1 = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      const item2 = CartItem.create({
        productId: 'item-2',
        productName: 'Pizza',
        quantity: 1,
        unitPrice: Money.BRL(30),
        restaurantId: 'restaurant-456',
      });

      cart.addItem(item1);

      expect(() => cart.addItem(item2)).toThrow(DomainException);
      expect(() => cart.addItem(item2)).toThrow('Cart can only contain items from one restaurant');
    });

    test('should reject adding to non-active cart', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);
      cart.checkout(); // Sets status to CHECKED_OUT

      const item2 = CartItem.create({
        productId: 'item-2',
        productName: 'Fries',
        quantity: 1,
        unitPrice: Money.BRL(10),
        restaurantId: 'restaurant-123',
      });

      expect(() => cart.addItem(item2)).toThrow(InvalidStateException);
      expect(() => cart.addItem(item2)).toThrow('Cannot add items to a non-active cart');
    });

    test('should emit cart.item-added event', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 2,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });

      cart.addItem(item);

      const events = cart.getDomainEvents();
      const addedEvent = events.find((e) => e.eventType === 'cart.item-added');
      expect(addedEvent).toBeDefined();
      expect(addedEvent?.data.productId).toBe('item-1');
      expect(addedEvent?.data.quantity).toBe(2);
    });
  });

  describe('removeItem()', () => {
    test('should remove item from cart', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      cart.removeItem('item-1');

      expect(cart.getItems()).toHaveLength(0);
      expect(cart.getRestaurantId()).toBeNull();
      expect(cart.getTotalAmount()).toEqual(Money.BRL(0));
    });

    test('should clear restaurantId when last item removed', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      expect(cart.getRestaurantId()).toBe('restaurant-123');

      cart.removeItem('item-1');

      expect(cart.getRestaurantId()).toBeNull();
    });

    test('should keep restaurantId when other items exist', () => {
      const cart = Cart.create('customer-123');
      const item1 = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      const item2 = CartItem.create({
        productId: 'item-2',
        productName: 'Fries',
        quantity: 1,
        unitPrice: Money.BRL(10),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item1);
      cart.addItem(item2);

      cart.removeItem('item-1');

      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getRestaurantId()).toBe('restaurant-123');
    });

    test('should reject removing non-existent item', () => {
      const cart = Cart.create('customer-123');

      expect(() => cart.removeItem('item-1')).toThrow(ResourceNotFoundException);
    });

    test('should reject removing from non-active cart', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);
      cart.checkout();

      expect(() => cart.removeItem('item-1')).toThrow(InvalidStateException);
    });

    test('should emit cart.item-removed event', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      cart.removeItem('item-1');

      const events = cart.getDomainEvents();
      const removedEvent = events.find((e) => e.eventType === 'cart.item-removed');
      expect(removedEvent).toBeDefined();
      expect(removedEvent?.data.productId).toBe('item-1');
    });
  });

  describe('updateItemQuantity()', () => {
    test('should update item quantity', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      cart.updateItemQuantity('item-1', 3);

      expect(cart.getItems()[0].quantity).toBe(3);
      expect(cart.getTotalAmount()).toEqual(Money.BRL(75));
    });

    test('should reject updating non-existent item', () => {
      const cart = Cart.create('customer-123');

      expect(() => cart.updateItemQuantity('item-1', 2)).toThrow(ResourceNotFoundException);
    });

    test('should reject zero or negative quantity', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      expect(() => cart.updateItemQuantity('item-1', 0)).toThrow(DomainException);
      expect(() => cart.updateItemQuantity('item-1', -1)).toThrow(DomainException);
    });

    test('should reject quantity > 99', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      expect(() => cart.updateItemQuantity('item-1', 100)).toThrow(DomainException);
    });

    test('should reject updating in non-active cart', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);
      cart.checkout();

      expect(() => cart.updateItemQuantity('item-1', 2)).toThrow(InvalidStateException);
    });

    test('should emit cart.item-updated event', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      cart.updateItemQuantity('item-1', 5);

      const events = cart.getDomainEvents();
      const updatedEvent = events.find((e) => e.eventType === 'cart.item-updated');
      expect(updatedEvent).toBeDefined();
      expect(updatedEvent?.data.productId).toBe('item-1');
      expect(updatedEvent?.data.quantity).toBe(5);
    });
  });

  describe('clear()', () => {
    test('should clear all items', () => {
      const cart = Cart.create('customer-123');
      const item1 = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      const item2 = CartItem.create({
        productId: 'item-2',
        productName: 'Fries',
        quantity: 2,
        unitPrice: Money.BRL(10),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item1);
      cart.addItem(item2);

      cart.clear();

      expect(cart.getItems()).toEqual([]);
      expect(cart.getRestaurantId()).toBeNull();
      expect(cart.getTotalAmount()).toEqual(Money.BRL(0));
    });

    test('should reject clearing non-active cart', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);
      cart.checkout();

      expect(() => cart.clear()).toThrow(InvalidStateException);
    });

    test('should emit cart.cleared event', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      cart.clear();

      const events = cart.getDomainEvents();
      const clearedEvent = events.find((e) => e.eventType === 'cart.cleared');
      expect(clearedEvent).toBeDefined();
    });
  });

  describe('checkout()', () => {
    test('should checkout active cart with items', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 2,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      cart.checkout();

      expect(cart.getStatus()).toBe(CartStatusEnum.CHECKED_OUT);
      expect(cart.getVersion()).toBe(2); // 1 for addItem, 1 for checkout
    });

    test('should reject checking out empty cart', () => {
      const cart = Cart.create('customer-123');

      expect(() => cart.checkout()).toThrow(DomainException);
      expect(() => cart.checkout()).toThrow('Cannot checkout an empty cart');
    });

    test('should emit cart.checked-out event with items', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 2,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      cart.checkout();

      const events = cart.getDomainEvents();
      const checkedOutEvent = events.find((e) => e.eventType === 'cart.checked-out');
      expect(checkedOutEvent).toBeDefined();
      expect(checkedOutEvent?.data.restaurantId).toBe('restaurant-123');
      expect(checkedOutEvent?.data.totalAmountCents).toBe(5000);
      expect(checkedOutEvent?.data.items).toHaveLength(1);
    });
  });

  describe('abandon()', () => {
    test('should abandon active cart', () => {
      const cart = Cart.create('customer-123');

      cart.abandon();

      expect(cart.getStatus()).toBe(CartStatusEnum.ABANDONED);
    });

    test('should emit cart.abandoned event', () => {
      const cart = Cart.create('customer-123');

      cart.abandon();

      const events = cart.getDomainEvents();
      const abandonedEvent = events.find((e) => e.eventType === 'cart.abandoned');
      expect(abandonedEvent).toBeDefined();
    });
  });

  describe('Getters', () => {
    test('isEmpty() should return true for empty cart', () => {
      const cart = Cart.create('customer-123');
      expect(cart.isEmpty()).toBe(true);
    });

    test('isEmpty() should return false for cart with items', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      expect(cart.isEmpty()).toBe(false);
    });

    test('isActive() should return true for active cart', () => {
      const cart = Cart.create('customer-123');
      expect(cart.isActive()).toBe(true);
    });

    test('isActive() should return false after checkout', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);
      cart.checkout();

      expect(cart.isActive()).toBe(false);
    });

    test('getItems() should return copy of items array', () => {
      const cart = Cart.create('customer-123');
      const item = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 1,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      cart.addItem(item);

      const items = cart.getItems();
      items.push(item as any); // Try to modify

      expect(cart.getItems()).toHaveLength(1);
    });
  });

  describe('Complex scenarios', () => {
    test('should handle complete cart lifecycle', () => {
      const cart = Cart.create('customer-123');

      // Add items
      const burger = CartItem.create({
        productId: 'item-1',
        productName: 'Burger',
        quantity: 2,
        unitPrice: Money.BRL(25),
        restaurantId: 'restaurant-123',
      });
      const fries = CartItem.create({
        productId: 'item-2',
        productName: 'Fries',
        quantity: 1,
        unitPrice: Money.BRL(10),
        restaurantId: 'restaurant-123',
      });

      cart.addItem(burger);
      expect(cart.getItems()).toHaveLength(1);

      cart.addItem(fries);
      expect(cart.getItems()).toHaveLength(2);
      expect(cart.getTotalAmount()).toEqual(Money.BRL(60));

      // Update quantity
      cart.updateItemQuantity('item-1', 3);
      expect(cart.getTotalAmount()).toEqual(Money.BRL(85));

      // Remove item
      cart.removeItem('item-2');
      expect(cart.getItems()).toHaveLength(1);
      expect(cart.getTotalAmount()).toEqual(Money.BRL(75));

      // Checkout
      cart.checkout();
      expect(cart.getStatus()).toBe(CartStatusEnum.CHECKED_OUT);

      // Cannot modify after checkout
      const drink = CartItem.create({
        productId: 'item-3',
        productName: 'Soda',
        quantity: 1,
        unitPrice: Money.BRL(5),
        restaurantId: 'restaurant-123',
      });
      expect(() => cart.addItem(drink)).toThrow(InvalidStateException);
    });
  });
});
