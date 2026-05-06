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

  describe('Refunds', () => {
    it('should partially refund a confirmed payment', () => {
      const payment = makePayment();
      payment.confirm();
      payment.refund(Money.BRL(20), 'customer request');

      expect(payment.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(payment.getRefundedAmount().amount).toBe(20);
      expect(payment.getRefundableAmount().amount).toBe(30);
    });

    it('should fully refund a confirmed payment', () => {
      const payment = makePayment();
      payment.confirm();
      payment.refund(Money.BRL(50), 'customer request');

      expect(payment.getStatus()).toBe(PaymentStatus.FULLY_REFUNDED);
      expect(payment.getRefundableAmount().amount).toBe(0);
      expect(payment.getRefundedAmount().amount).toBe(50);
    });

    it('should support multiple partial refunds', () => {
      const payment = makePayment();
      payment.confirm();

      payment.refund(Money.BRL(10), 'first refund');
      expect(payment.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(payment.getRefundedAmount().amount).toBe(10);

      payment.refund(Money.BRL(20), 'second refund');
      expect(payment.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(payment.getRefundedAmount().amount).toBe(30);

      payment.refund(Money.BRL(20), 'final refund');
      expect(payment.getStatus()).toBe(PaymentStatus.FULLY_REFUNDED);
      expect(payment.getRefundedAmount().amount).toBe(50);
    });

    it('should NOT refund a pending payment', () => {
      const payment = makePayment();
      expect(() => payment.refund(Money.BRL(10), 'test')).toThrow();
    });

    it('should NOT refund a rejected payment', () => {
      const payment = makePayment();
      payment.reject('insufficient funds');
      expect(() => payment.refund(Money.BRL(10), 'test')).toThrow();
    });

    it('should NOT refund more than refundable amount', () => {
      const payment = makePayment();
      payment.confirm();
      payment.refund(Money.BRL(20), 'first refund');

      expect(() => payment.refund(Money.BRL(40), 'excess refund')).toThrow();
    });

    it('should emit payment.refund.completed event on refund', () => {
      const payment = makePayment();
      payment.confirm();
      payment.refund(Money.BRL(25), 'customer request');

      const events = payment.getDomainEvents();
      const refundEvent = events.find((e) => e.eventType === 'payment.refund.completed');
      const data = refundEvent?.data as any;

      expect(refundEvent).toBeDefined();
      expect(data?.paymentId).toBe(payment.getId());
      expect(data?.orderId).toBe('order-1');
      expect(data?.refundedAmountCents).toBe(2500); // 25 BRL = 2500 cents
      expect(data?.refundId).toBeDefined();
      expect(data?.reason).toBe('customer request');
    });

    it('should calculate refundable amount correctly', () => {
      const payment = makePayment();
      payment.confirm();

      expect(payment.getRefundableAmount().amount).toBe(50);

      payment.refund(Money.BRL(15), 'partial refund');
      expect(payment.getRefundableAmount().amount).toBe(35);

      payment.refund(Money.BRL(35), 'remaining refund');
      expect(payment.getRefundableAmount().amount).toBe(0);
    });

    it('should handle idempotent refunds with same refundId', () => {
      const payment = makePayment();
      payment.confirm();

      const refundId = 'refund-123';
      payment.refund(Money.BRL(20), 'first attempt', refundId);
      expect(payment.getRefundedAmount().amount).toBe(20);
      expect(payment.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);

      // Second call with same refundId should be idempotent (no-op)
      payment.refund(Money.BRL(10), 'duplicate attempt', refundId);
      expect(payment.getRefundedAmount().amount).toBe(20); // Still 20, not 30
      expect(payment.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);

      // Different refundId should process new refund
      payment.refund(Money.BRL(10), 'second refund', 'refund-456');
      expect(payment.getRefundedAmount().amount).toBe(30);
    });
  });
});
