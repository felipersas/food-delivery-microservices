import { describe, it, expect, beforeEach } from 'bun:test';
import { Customer } from '@domain/aggregates/customer.aggregate';
import { CustomerStatus, CustomerStatusEnum } from '@domain/value-objects/customer-status.vo';
import { CustomerAddress } from '@domain/value-objects/customer-address.vo';
import { PaymentMethod } from '@domain/value-objects/payment-method.vo';

function makeCustomer(overrides: { name?: string; email?: string; phone?: string } = {}): Customer {
  return new Customer({
    name: overrides.name ?? 'John Doe',
    email: overrides.email ?? 'john@example.com',
    phone: overrides.phone ?? '+5511999999999',
  });
}

describe('Customer Aggregate', () => {
  describe('create', () => {
    it('should create a customer with ACTIVE status', () => {
      const customer = Customer.create({
        name: 'John Doe',
        email: 'john.doe@example.com',
        phone: '+5511999999999',
      });

      expect(customer.getId()).toBeDefined();
      expect(customer.getStatus()).toBe(CustomerStatusEnum.ACTIVE);
      expect(customer.getName()).toBe('John Doe');
      expect(customer.getEmail()).toBe('john.doe@example.com');
      expect(customer.getPhone()).toBe('+5511999999999');
      expect(customer.getTotalOrders()).toBe(0);
      expect(customer.getTotalSpent()).toBe(0);
    });

    it('should emit CustomerCreated domain event', () => {
      const customer = Customer.create({
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+5511888888888',
      });

      const events = customer.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('customer.created');
      expect(events[0].aggregateType).toBe('Customer');
      expect((events[0].data as any).name).toBe('Jane Doe');
    });

    it('should validate email format', () => {
      expect(() => {
        Customer.create({
          name: 'Test',
          email: 'invalid-email',
          phone: '+5511999999999',
        });
      }).toThrow('Invalid email format');
    });

    it('should validate phone format', () => {
      expect(() => {
        Customer.create({
          name: 'Test',
          email: 'test@example.com',
          phone: 'invalid',
        });
      }).toThrow('Invalid phone number format');
    });
  });

  describe('profile management', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = makeCustomer();
      customer.clearDomainEvents();
    });

    it('should update customer name', () => {
      customer.updateProfile({ name: 'Jane Doe' });

      expect(customer.getName()).toBe('Jane Doe');
      expect(customer.getVersion()).toBe(1);
    });

    it('should update customer email', () => {
      customer.updateProfile({ email: 'janedoe@example.com' });

      expect(customer.getEmail()).toBe('janedoe@example.com');
      expect(customer.getVersion()).toBe(1);
    });

    it('should update customer phone', () => {
      customer.updateProfile({ phone: '+5511888888888' });

      expect(customer.getPhone()).toBe('+5511888888888');
      expect(customer.getVersion()).toBe(1);
    });

    it('should emit CustomerUpdated event on profile update', () => {
      customer.updateProfile({ name: 'Updated Name' });

      const events = customer.getDomainEvents();
      expect(events).toHaveLength(1);
      expect(events[0].eventType).toBe('customer.updated');
      expect((events[0].data as any).name).toBe('Updated Name');
    });
  });

  describe('status management', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = makeCustomer();
      customer.clearDomainEvents();
    });

    it('should deactivate active customer', () => {
      customer.deactivate();

      expect(customer.getStatus()).toBe(CustomerStatusEnum.INACTIVE);
      expect(customer.getUpdatedAt().getTime()).toBeGreaterThan(Date.now() - 1000);
    });

    it('should reactivate inactive customer', () => {
      customer.deactivate();
      customer.activate();

      expect(customer.getStatus()).toBe(CustomerStatusEnum.ACTIVE);
    });

    it('should suspend active customer', () => {
      customer.suspend();

      expect(customer.getStatus()).toBe(CustomerStatusEnum.SUSPENDED);
    });

    it('should not suspend inactive customer', () => {
      customer.deactivate();

      expect(() => customer.suspend()).toThrow(
        'Cannot transition from INACTIVE to SUSPENDED',
      );
    });

    it('should not deactivate already inactive customer', () => {
      customer.deactivate();

      expect(() => customer.deactivate()).toThrow(
        'Cannot transition from INACTIVE to INACTIVE',
      );
    });
  });

  describe('address management', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = makeCustomer();
      customer.clearDomainEvents();
    });

    it('should add address to customer', () => {
      customer.addAddress({
        street: 'Av Paulista',
        number: '1000',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01310-100',
      });

      expect(customer.getAddresses()).toHaveLength(1);
      const address = customer.getAddresses()[0];
      expect(address.street).toBe('Av Paulista');
      expect(address.isDefault).toBe(true);
    });

    it('should set first address as default', () => {
      customer.addAddress({
        street: 'Rua A',
        number: '1',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      });

      expect(customer.getAddresses()[0].isDefault).toBe(true);
    });

    it('should remove default flag from other addresses when adding default', () => {
      customer.addAddress({
        street: 'Rua A',
        number: '1',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      });

      customer.addAddress({
        street: 'Rua B',
        number: '2',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-568',
      });

      expect(customer.getAddresses()[0].isDefault).toBe(false);
      expect(customer.getAddresses()[1].isDefault).toBe(true);
    });

    it('should emit customer.address.added event', () => {
      customer.addAddress({
        street: 'Rua Test',
        number: '123',
        city: 'Rio de Janeiro',
        state: 'RJ',
        zipCode: '20040-002',
      });

      const events = customer.getDomainEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);
      const addressAddedEvent = events.find((e: any) => e.eventType === 'customer.address.added');
      expect(addressAddedEvent).toBeDefined();
    });

    it('should remove address by index', () => {
      customer.addAddress({
        street: 'Rua A',
        number: '1',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      });

      customer.removeAddress(0);

      expect(customer.getAddresses()).toHaveLength(0);
    });

    it('should make first remaining address default when removing default', () => {
      customer.addAddress({
        street: 'Rua A',
        number: '1',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      });

      customer.addAddress({
        street: 'Rua B',
        number: '2',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-568',
      });

      customer.removeAddress(0);

      expect(customer.getAddresses()[0].isDefault).toBe(true);
    });

    it('should throw on invalid address index', () => {
      expect(() => customer.removeAddress(99)).toThrow('Invalid address index');
    });
  });

  describe('payment method management', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = makeCustomer();
      customer.clearDomainEvents();
    });

    it('should save payment method', () => {
      customer.savePaymentMethod({
        token: '1234',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2026,
      });

      expect(customer.getPaymentMethods()).toHaveLength(1);
      const pm = customer.getPaymentMethods()[0];
      expect(pm.token).toBe('1234');
      expect(pm.brand).toBe('visa');
      expect(pm.isDefault).toBe(true);
    });

    it('should set first method as default', () => {
      customer.savePaymentMethod({
        token: '1111',
        brand: 'mastercard',
        expiryMonth: 6,
        expiryYear: 2026,
      });

      expect(customer.getPaymentMethods()[0].isDefault).toBe(true);
    });

    it('should remove default flag from other methods when adding default', () => {
      customer.savePaymentMethod({
        token: '1111',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2026,
      });

      customer.savePaymentMethod({
        token: '2222',
        brand: 'mastercard',
        expiryMonth: 6,
        expiryYear: 2027,
      });

      expect(customer.getPaymentMethods()[0].isDefault).toBe(false);
      expect(customer.getPaymentMethods()[1].isDefault).toBe(true);
    });

    it('should emit customer.payment-method.added event', () => {
      customer.savePaymentMethod({
        token: '4321',
        brand: 'amex',
        expiryMonth: 3,
        expiryYear: 2027,
      });

      const events = customer.getDomainEvents();
      expect(events.length).toBeGreaterThanOrEqual(1);
      const pmEvent = events.find((e: any) => e.eventType === 'customer.payment-method.added');
      expect(pmEvent).toBeDefined();
      expect((pmEvent!.data as any).brand).toBe('amex');
    });

    it('should remove payment method by index', () => {
      customer.savePaymentMethod({
        token: '1111',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2026,
      });

      customer.removePaymentMethod(0);

      expect(customer.getPaymentMethods()).toHaveLength(0);
    });

    it('should make first remaining method default when removing default', () => {
      customer.savePaymentMethod({
        token: '1111',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2026,
      });

      customer.savePaymentMethod({
        token: '2222',
        brand: 'mastercard',
        expiryMonth: 6,
        expiryYear: 2027,
      });

      customer.removePaymentMethod(0);

      expect(customer.getPaymentMethods()[0].isDefault).toBe(true);
    });
  });

  describe('order statistics', () => {
    let customer: Customer;

    beforeEach(() => {
      customer = makeCustomer();
      customer.clearDomainEvents();
    });

    it('should record order and update statistics', () => {
      customer.recordOrder(100);

      expect(customer.getTotalOrders()).toBe(1);
      expect(customer.getTotalSpent()).toBe(100);
      expect(customer.getVersion()).toBe(1);
    });

    it('should accumulate multiple orders', () => {
      customer.recordOrder(50);
      customer.recordOrder(75);
      customer.recordOrder(25);

      expect(customer.getTotalOrders()).toBe(3);
      expect(customer.getTotalSpent()).toBe(150);
    });
  });

  describe('versioning', () => {
    it('should increment version on each state change', () => {
      const customer = makeCustomer();
      customer.clearDomainEvents();

      expect(customer.getVersion()).toBe(0);

      customer.updateProfile({ name: 'Updated' });
      expect(customer.getVersion()).toBe(1);

      customer.addAddress({
        street: 'Rua Test',
        number: '1',
        city: 'São Paulo',
        state: 'SP',
        zipCode: '01234-567',
      });
      expect(customer.getVersion()).toBe(2);

      customer.recordOrder(100);
      expect(customer.getVersion()).toBe(3);
    });
  });
});
