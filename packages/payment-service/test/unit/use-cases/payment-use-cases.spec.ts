import { describe, it, expect, beforeEach } from 'bun:test';
import { ProcessPaymentUseCase } from '@application/use-cases/process-payment/process-payment.use-case';
import { RefundPaymentUseCase } from '@application/use-cases/refund-payment/refund-payment.use-case';
import {
  Payment,
  PaymentMethod,
  PaymentStatus,
} from '@domain/aggregates/payment.aggregate';
import { Money } from '@app/shared';
import type { PaymentRepository } from '@domain/repositories/payment.repository.interface';
import type { EventPublisher } from '@app/shared';

// Mock implementations
class MockPaymentRepository implements PaymentRepository {
  private payments = new Map<string, Payment>();

  async save(payment: Payment): Promise<void> {
    this.payments.set(payment.getId(), payment);
  }

  async findById(id: string): Promise<Payment | null> {
    return this.payments.get(id) || null;
  }

  async findByOrderId(orderId: string): Promise<Payment[]> {
    return Array.from(this.payments.values()).filter(
      (p) => p.getOrderId() === orderId,
    );
  }

  async delete(id: string): Promise<void> {
    this.payments.delete(id);
  }

  // Helper for tests
  clear(): void {
    this.payments.clear();
  }
}

class MockEventPublisher implements EventPublisher {
  publishedEvents: unknown[] = [];

  async publishAll(events: unknown[]): Promise<void> {
    this.publishedEvents.push(...events);
  }

  clear(): void {
    this.publishedEvents = [];
  }
}

describe('Payment Service Use Cases Unit Tests', () => {
  let repo: MockPaymentRepository;
  let publisher: MockEventPublisher;
  let processPaymentUseCase: ProcessPaymentUseCase;
  let refundUseCase: RefundPaymentUseCase;

  beforeEach(() => {
    repo = new MockPaymentRepository();
    publisher = new MockEventPublisher();
    processPaymentUseCase = new ProcessPaymentUseCase(repo);
    refundUseCase = new RefundPaymentUseCase(repo, publisher);
  });

  describe('ProcessPaymentUseCase', () => {
    it('should process PIX payment and confirm for valid amount', async () => {
      const result = await processPaymentUseCase.execute({
        orderId: 'order-123',
        amount: 50,
        method: 'PIX',
        customerId: 'customer-456',
        paymentMethodToken: 'mock-token',
      });

      expect(result.paymentId).toBeDefined();
      expect(result.status).toBe(PaymentStatus.CONFIRMED);
    });

    it('should process credit card payment and confirm for valid amount', async () => {
      const result = await processPaymentUseCase.execute({
        orderId: 'order-123',
        amount: 100,
        method: 'CREDIT_CARD',
        customerId: 'customer-456',
        paymentMethodToken: '4242',
        paymentMethodBrand: 'visa',
      });

      expect(result.paymentId).toBeDefined();
      expect(result.status).toBe(PaymentStatus.CONFIRMED);
    });

    it('should reject payment for high-value amounts (> 1000)', async () => {
      const result = await processPaymentUseCase.execute({
        orderId: 'order-123',
        amount: 1500,
        method: 'CREDIT_CARD',
        customerId: 'customer-456',
        paymentMethodToken: '4242',
        paymentMethodBrand: 'visa',
      });

      expect(result.paymentId).toBeDefined();
      expect(result.status).toBe(PaymentStatus.REJECTED);
    });

    it('should save payment to repository', async () => {
      const result = await processPaymentUseCase.execute({
        orderId: 'order-123',
        amount: 50,
        method: 'PIX',
        customerId: 'customer-456',
        paymentMethodToken: 'mock-token',
      });

      const saved = await repo.findById(result.paymentId);
      expect(saved).not.toBeNull();
      expect(saved!.getOrderId()).toBe('order-123');
      expect(saved!.getStatus()).toBe(PaymentStatus.CONFIRMED);
      expect(saved!.getAmount().amount).toBe(50);
    });

    it('should create payment with correct amount in cents', async () => {
      const result = await processPaymentUseCase.execute({
        orderId: 'order-123',
        amount: 99.99,
        method: 'PIX',
        customerId: 'customer-456',
        paymentMethodToken: 'mock-token',
      });

      const saved = await repo.findById(result.paymentId);
      expect(saved!.getAmount().amount).toBe(99.99);
    });
  });

  describe('RefundPaymentUseCase', () => {
    it('should process partial refund', async () => {
      // First create a confirmed payment
      const payment = new Payment({
        id: 'payment-123',
        orderId: 'order-123',
        amount: Money.BRL(100),
        method: PaymentMethod.CREDIT_CARD,
        paymentMethodToken: '4242',
        paymentMethodBrand: 'visa',
        customerId: 'customer-456',
      });
      payment.confirm();
      await repo.save(payment);

      // Process partial refund
      const result = await refundUseCase.execute({
        paymentId: 'payment-123',
        amount: 30,
        reason: 'Customer request',
      });

      expect(result.paymentId).toBe('payment-123');
      expect(result.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(result.refundedAmount).toBe(30);
      expect(result.refundId).toBeDefined();
    });

    it('should process full refund', async () => {
      // First create a confirmed payment
      const payment = new Payment({
        id: 'payment-123',
        orderId: 'order-123',
        amount: Money.BRL(50),
        method: PaymentMethod.PIX,
        paymentMethodToken: 'mock-token',
        customerId: 'customer-456',
      });
      payment.confirm();
      await repo.save(payment);

      // Process full refund
      const result = await refundUseCase.execute({
        paymentId: 'payment-123',
        amount: 50,
        reason: 'Order cancelled',
      });

      expect(result.paymentId).toBe('payment-123');
      expect(result.status).toBe(PaymentStatus.FULLY_REFUNDED);
      expect(result.refundedAmount).toBe(50);
    });

    it('should handle idempotent refunds with same refundId', async () => {
      const payment = new Payment({
        id: 'payment-123',
        orderId: 'order-123',
        amount: Money.BRL(100),
        method: PaymentMethod.PIX,
        paymentMethodToken: 'mock-token',
        customerId: 'customer-456',
      });
      payment.confirm();
      await repo.save(payment);

      const refundId = 'refund-abc-123';

      // First refund
      const result1 = await refundUseCase.execute({
        paymentId: 'payment-123',
        amount: 25,
        reason: 'Partial refund',
        refundId,
      });

      expect(result1.refundedAmount).toBe(25);

      // Second refund with same refundId (idempotent)
      const result2 = await refundUseCase.execute({
        paymentId: 'payment-123',
        amount: 25,
        reason: 'Partial refund',
        refundId,
      });

      // Should still be 25, not 50 (idempotent)
      expect(result2.refundedAmount).toBe(25);

      const saved = await repo.findById('payment-123');
      expect(saved!.getRefundedAmount().amount).toBe(25);
    });

    it('should save updated payment to repository', async () => {
      const payment = new Payment({
        id: 'payment-123',
        orderId: 'order-123',
        amount: Money.BRL(100),
        method: PaymentMethod.CREDIT_CARD,
        paymentMethodToken: '4242',
        paymentMethodBrand: 'visa',
        customerId: 'customer-456',
      });
      payment.confirm();
      await repo.save(payment);

      await refundUseCase.execute({
        paymentId: 'payment-123',
        amount: 30,
        reason: 'Customer request',
      });

      const saved = await repo.findById('payment-123');
      expect(saved!.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(saved!.getRefundedAmount().amount).toBe(30);
    });

    it('should publish domain events on refund', async () => {
      const payment = new Payment({
        id: 'payment-123',
        orderId: 'order-123',
        amount: Money.BRL(50),
        method: PaymentMethod.PIX,
        paymentMethodToken: 'mock-token',
        customerId: 'customer-456',
      });
      payment.confirm();
      await repo.save(payment);

      publisher.clear();

      await refundUseCase.execute({
        paymentId: 'payment-123',
        amount: 50,
        reason: 'Full refund',
      });

      expect(publisher.publishedEvents.length).toBeGreaterThan(0);

      const refundEvent = publisher.publishedEvents.find(
        (e: any) => e.eventType === 'payment.refund.completed',
      );
      expect(refundEvent).toBeDefined();
    });
  });

  describe('End-to-End Flow', () => {
    it('should complete payment → partial refund flow', async () => {
      // Step 1: Process payment
      const paymentResult = await processPaymentUseCase.execute({
        orderId: 'order-123',
        amount: 100,
        method: 'CREDIT_CARD',
        customerId: 'customer-456',
        paymentMethodToken: '4242',
        paymentMethodBrand: 'visa',
      });

      expect(paymentResult.status).toBe(PaymentStatus.CONFIRMED);

      // Step 2: Process partial refund
      const refundResult = await refundUseCase.execute({
        paymentId: paymentResult.paymentId,
        amount: 30,
        reason: 'Customer request',
      });

      expect(refundResult.status).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(refundResult.refundedAmount).toBe(30);

      // Verify final state
      const saved = await repo.findById(paymentResult.paymentId);
      expect(saved!.getStatus()).toBe(PaymentStatus.PARTIALLY_REFUNDED);
      expect(saved!.getRefundedAmount().amount).toBe(30);
      expect(saved!.getAmount().amount).toBe(100);
    });

    it('should complete payment → full refund flow', async () => {
      // Step 1: Process payment
      const paymentResult = await processPaymentUseCase.execute({
        orderId: 'order-123',
        amount: 50,
        method: 'PIX',
        customerId: 'customer-456',
        paymentMethodToken: 'mock-token',
      });

      expect(paymentResult.status).toBe(PaymentStatus.CONFIRMED);

      // Step 2: Process full refund
      const refundResult = await refundUseCase.execute({
        paymentId: paymentResult.paymentId,
        amount: 50,
        reason: 'Order cancelled',
      });

      expect(refundResult.status).toBe(PaymentStatus.FULLY_REFUNDED);
      expect(refundResult.refundedAmount).toBe(50);

      // Verify final state
      const saved = await repo.findById(paymentResult.paymentId);
      expect(saved!.getStatus()).toBe(PaymentStatus.FULLY_REFUNDED);
      expect(saved!.getRefundedAmount().amount).toBe(50);
    });
  });
});
