import { describe, it, expect } from 'bun:test';
import { CustomerStatus, CustomerStatusEnum } from '@domain/value-objects/customer-status.vo';

describe('CustomerStatus Value Object', () => {
  describe('factory methods', () => {
    it('should create ACTIVE status', () => {
      const status = CustomerStatus.active();
      expect(status.value).toBe(CustomerStatusEnum.ACTIVE);
    });

    it('should create INACTIVE status', () => {
      const status = CustomerStatus.inactive();
      expect(status.value).toBe(CustomerStatusEnum.INACTIVE);
    });

    it('should create SUSPENDED status', () => {
      const status = CustomerStatus.suspended();
      expect(status.value).toBe(CustomerStatusEnum.SUSPENDED);
    });
  });

  describe('state transitions', () => {
    it('should allow ACTIVE to INACTIVE transition', () => {
      const active = CustomerStatus.active();
      const inactive = CustomerStatus.inactive();

      expect(active.canTransitionTo(inactive)).toBe(true);
    });

    it('should allow ACTIVE to SUSPENDED transition', () => {
      const active = CustomerStatus.active();
      const suspended = CustomerStatus.suspended();

      expect(active.canTransitionTo(suspended)).toBe(true);
    });

    it('should allow INACTIVE to ACTIVE transition', () => {
      const inactive = CustomerStatus.inactive();
      const active = CustomerStatus.active();

      expect(inactive.canTransitionTo(active)).toBe(true);
    });

    it('should not allow INACTIVE to SUSPENDED transition', () => {
      const inactive = CustomerStatus.inactive();
      const suspended = CustomerStatus.suspended();

      expect(inactive.canTransitionTo(suspended)).toBe(false);
    });

    it('should allow SUSPENDED to ACTIVE transition', () => {
      const suspended = CustomerStatus.suspended();
      const active = CustomerStatus.active();

      expect(suspended.canTransitionTo(active)).toBe(true);
    });

    it('should allow SUSPENDED to INACTIVE transition', () => {
      const suspended = CustomerStatus.suspended();
      const inactive = CustomerStatus.inactive();

      expect(suspended.canTransitionTo(inactive)).toBe(true);
    });

    it('should not allow ACTIVE to ACTIVE transition', () => {
      const active = CustomerStatus.active();

      expect(active.canTransitionTo(active)).toBe(false);
    });

    it('should not allow INACTIVE to INACTIVE transition', () => {
      const inactive = CustomerStatus.inactive();

      expect(inactive.canTransitionTo(inactive)).toBe(false);
    });

    it('should not allow DELIVERED to ACTIVE transition', () => {
      const suspended = CustomerStatus.suspended();
      const active = CustomerStatus.active();

      expect(suspended.canTransitionTo(active)).toBe(true);
    });
  });
});
