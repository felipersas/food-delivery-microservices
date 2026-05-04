import { describe, it, expect } from 'bun:test';
import { Money } from '@app/shared';
import { Payment, PaymentStatus, PaymentMethod } from '@domain/aggregates/payment.aggregate';

describe('Payment Aggregate', () => {
  function makePayment(): Payment {
    return new Payment({
      orderId: 'order-1',
      amount: Money.BRL(50),
      method: PaymentMethod.PIX,
    });
  }

  it('should create with PENDING status', () => {
    const payment = makePayment();
    expect(payment.getStatus()).toBe(PaymentStatus.PENDING);
    expect(payment.getOrderId()).toBe('order-1');
    expect(payment.getAmount().amount).toBe(50);
  });

  it('should transition PENDING → CONFIRMED', () => {
    const payment = makePayment();
    payment.confirm();
    expect(payment.getStatus()).toBe(PaymentStatus.CONFIRMED);
  });

  it('should transition PENDING → REJECTED', () => {
    const payment = makePayment();
    payment.reject('insufficient funds');
    expect(payment.getStatus()).toBe(PaymentStatus.REJECTED);
  });

  it('should NOT confirm an already confirmed payment', () => {
    const payment = makePayment();
    payment.confirm();
    expect(() => payment.confirm()).toThrow();
  });
});
