import { describe, expect, it } from 'bun:test';
import { PaymentMethod } from '@domain/value-objects/payment-method.vo';

describe('PaymentMethod Value Object', () => {
  const validProps = {
    token: '1234',
    brand: 'visa',
    expiryMonth: 12,
    expiryYear: 2026,
    isDefault: false,
  };

  describe('create', () => {
    it('should create valid payment method', () => {
      const pm = PaymentMethod.create(validProps);

      expect(pm.token).toBe('1234');
      expect(pm.brand).toBe('visa');
      expect(pm.expiryMonth).toBe(12);
      expect(pm.expiryYear).toBe(2026);
      expect(pm.isDefault).toBe(false);
    });

    it('should throw on invalid token (not 4 digits)', () => {
      const props = { ...validProps, token: '123' };
      expect(() => PaymentMethod.create(props)).toThrow('Token must be last 4 digits');
    });

    it('should throw on non-numeric token', () => {
      const props = { ...validProps, token: 'abcd' };
      expect(() => PaymentMethod.create(props)).toThrow('Token must contain only digits');
    });

    it('should throw on invalid brand', () => {
      const props = { ...validProps, brand: 'unknown' as any };
      expect(() => PaymentMethod.create(props)).toThrow('Invalid payment brand');
    });

    it('should throw on invalid month (< 1)', () => {
      const props = { ...validProps, expiryMonth: 0 };
      expect(() => PaymentMethod.create(props)).toThrow('Expiry month must be between 1 and 12');
    });

    it('should throw on invalid month (> 12)', () => {
      const props = { ...validProps, expiryMonth: 13 };
      expect(() => PaymentMethod.create(props)).toThrow('Expiry month must be between 1 and 12');
    });

    it('should throw on expired card (past month/year)', () => {
      const currentYear = new Date().getFullYear();
      const lastYear = currentYear - 1;
      const props = { ...validProps, expiryYear: lastYear, expiryMonth: 12 };
      expect(() => PaymentMethod.create(props)).toThrow('Expiry year must be between');
    });

    it('should throw on future year (> +20)', () => {
      const currentYear = new Date().getFullYear();
      const props = { ...validProps, expiryYear: currentYear + 21 };
      expect(() => PaymentMethod.create(props)).toThrow('Expiry year must be between');
    });
  });

  describe('displayValue', () => {
    it('should return formatted display string', () => {
      const pm = PaymentMethod.create(validProps);

      expect(pm.displayValue).toBe('VISA •••• 1234');
    });
  });

  describe('makeDefault/removeDefault', () => {
    it('should set and remove default flag', () => {
      const pm = PaymentMethod.create({ ...validProps, isDefault: false });

      const defaultPm = pm.makeDefault();
      expect(defaultPm.isDefault).toBe(true);

      const notDefault = defaultPm.removeDefault();
      expect(notDefault.isDefault).toBe(false);
    });
  });
});
