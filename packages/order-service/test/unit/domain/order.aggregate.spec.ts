import { describe, it, expect } from 'bun:test';
import { Money } from '@app/shared';
import { Order } from '../../../src/domain/aggregates/order.aggregate';
import { OrderItem } from '../../../src/domain/value-objects/order-item.vo';
import { OrderStatusEnum } from '../../../src/domain/value-objects/order-status.vo';

function makeItem(overrides: { price?: number; quantity?: number } = {}): OrderItem {
  return new OrderItem({
    productId: 'prod-1',
    productName: 'X-Burger',
    quantity: overrides.quantity ?? 2,
    unitPrice: Money.BRL(overrides.price ?? 25),
  });
}

function makeOrder(overrides: { items?: OrderItem[] } = {}): Order {
  return new Order({
    customerId: 'customer-1',
    restaurantId: 'restaurant-1',
    items: overrides.items ?? [makeItem()],
  });
}

describe('Order Aggregate', () => {
  describe('create', () => {
    it('should create an order with PENDING status', () => {
      const order = Order.create({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        items: [makeItem()],
      });

      expect(order.getStatus()).toBe(OrderStatusEnum.PENDING);
      expect(order.getCustomerId()).toBe('customer-1');
      expect(order.getRestaurantId()).toBe('restaurant-1');
    });

    it('should calculate total from items', () => {
      const items = [
        makeItem({ price: 25, quantity: 2 }), // 50
        makeItem({ price: 10, quantity: 3 }), // 30
      ];

      const order = Order.create({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        items,
      });

      expect(order.getTotalAmount().amount).toBe(80);
    });

    it('should emit OrderCreated domain event', () => {
      const order = Order.create({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        items: [makeItem()],
      });

      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('order.created');
    });

    it('should generate an id', () => {
      const order = makeOrder();
      expect(order.getId()).toBeDefined();
      expect(typeof order.getId()).toBe('string');
    });
  });

  describe('confirm', () => {
    it('should transition from PENDING to CONFIRMED', () => {
      const order = makeOrder();
      order.confirm();
      expect(order.getStatus()).toBe(OrderStatusEnum.CONFIRMED);
    });

    it('should emit OrderConfirmed event', () => {
      const order = makeOrder();
      order.clearDomainEvents();
      order.confirm();
      const events = order.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('order.confirmed');
    });
  });

  describe('startPreparing', () => {
    it('should transition from CONFIRMED to PREPARING', () => {
      const order = makeOrder();
      order.confirm();
      order.startPreparing();
      expect(order.getStatus()).toBe(OrderStatusEnum.PREPARING);
    });

    it('should NOT transition from PENDING to PREPARING', () => {
      const order = makeOrder();
      expect(() => order.startPreparing()).toThrow();
    });
  });

  describe('cancel', () => {
    it('should transition from PENDING to CANCELLED', () => {
      const order = makeOrder();
      order.cancel();
      expect(order.getStatus()).toBe(OrderStatusEnum.CANCELLED);
    });

    it('should NOT cancel a DELIVERED order', () => {
      const order = makeOrder();
      order.confirm();
      order.startPreparing();
      order.markReady();
      expect(() => order.cancel()).toThrow();
    });
  });

  describe('versioning', () => {
    it('should increment version on each transition', () => {
      const order = makeOrder();
      expect(order.getVersion()).toBe(0);
      order.confirm();
      expect(order.getVersion()).toBe(1);
      order.startPreparing();
      expect(order.getVersion()).toBe(2);
    });
  });
});
