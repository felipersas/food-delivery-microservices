import { AggregateRoot, Money, InvalidStateException } from '@app/shared';
import { v4 as uuidv4 } from 'uuid';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  FULLY_REFUNDED = 'FULLY_REFUNDED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PIX = 'PIX',
  CASH = 'CASH',
}

export class Payment extends AggregateRoot<string> {
  private orderId: string;
  private amount: Money;
  private method: PaymentMethod;
  private status: PaymentStatus;
  private paymentMethodToken?: string; // Last 4 digits
  private paymentMethodBrand?: string; // visa, mastercard, etc.
  private customerId?: string;
  private refundedAmount: Money;
  private processedRefundIds: Set<string>;

  constructor(props: {
    id?: string;
    orderId: string;
    amount: Money;
    method: PaymentMethod;
    paymentMethodToken?: string;
    paymentMethodBrand?: string;
    customerId?: string;
    refundedAmount?: Money;
    processedRefundIds?: string[];
  }) {
    super(props.id ?? uuidv4());
    this.orderId = props.orderId;
    this.amount = props.amount;
    this.method = props.method;
    this.status = PaymentStatus.PENDING;
    this.paymentMethodToken = props.paymentMethodToken;
    this.paymentMethodBrand = props.paymentMethodBrand;
    this.customerId = props.customerId;
    this.refundedAmount = props.refundedAmount ?? Money.BRL(0);
    this.processedRefundIds = new Set(props.processedRefundIds ?? []);
  }

  static reconstitute(props: {
    id: string;
    orderId: string;
    amount: Money;
    method: PaymentMethod;
    status: PaymentStatus;
    version: number;
    paymentMethodToken?: string;
    paymentMethodBrand?: string;
    customerId?: string;
    refundedAmount?: Money;
    processedRefundIds?: string[];
  }): Payment {
    const payment = new Payment({
      id: props.id,
      orderId: props.orderId,
      amount: props.amount,
      method: props.method,
      paymentMethodToken: props.paymentMethodToken,
      paymentMethodBrand: props.paymentMethodBrand,
      customerId: props.customerId,
      refundedAmount: props.refundedAmount,
      processedRefundIds: props.processedRefundIds,
    });
    payment.setRawState('status', props.status);
    for (let i = 0; i < props.version; i++) {
      payment.incrementVersion();
    }
    return payment;
  }

  confirm(): void {
    if (this.status !== PaymentStatus.PENDING) {
      throw new InvalidStateException(`Cannot confirm payment in ${this.status} status`);
    }
    if (!this.paymentMethodToken) {
      throw new InvalidStateException('Cannot confirm payment without payment method token');
    }
    this.status = PaymentStatus.CONFIRMED;
    this.incrementVersion();
  }

  reject(_reason: string): void {
    if (this.status !== PaymentStatus.PENDING) {
      throw new InvalidStateException(`Cannot reject payment in ${this.status} status`);
    }
    this.status = PaymentStatus.REJECTED;
    this.incrementVersion();
  }

  refund(amount: Money, reason: string, refundId?: string): void {
    if (this.status !== PaymentStatus.CONFIRMED && this.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new InvalidStateException(`Cannot refund payment in ${this.status} status`);
    }

    // Idempotency: Check if this refund was already processed
    const effectiveRefundId = refundId ?? uuidv4();
    if (this.processedRefundIds.has(effectiveRefundId)) {
      // Idempotent: refund already processed, return without error
      return;
    }

    const refundableAmount = this.getRefundableAmount();
    if (amount.amount > refundableAmount.amount) {
      throw new InvalidStateException(
        `Refund amount ${amount.amount} exceeds refundable amount ${refundableAmount.amount}`,
      );
    }

    this.refundedAmount = this.refundedAmount.add(amount);
    this.processedRefundIds.add(effectiveRefundId);

    // Update status based on remaining refundable amount
    const newRefundableAmount = this.getRefundableAmount();
    if (newRefundableAmount.amount === 0) {
      this.status = PaymentStatus.FULLY_REFUNDED;
    } else {
      this.status = PaymentStatus.PARTIALLY_REFUNDED;
    }

    this.incrementVersion();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'payment.refund.completed',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Payment',
      data: {
        paymentId: this.getId(),
        orderId: this.orderId,
        customerId: this.customerId,
        refundedAmountCents: amount.cents,
        refundId: effectiveRefundId,
        reason,
      },
    });
  }

  getRefundableAmount(): Money {
    return this.amount.subtract(this.refundedAmount);
  }

  getRefundedAmount(): Money {
    return this.refundedAmount;
  }

  getStatus(): PaymentStatus {
    return this.status;
  }

  getOrderId(): string {
    return this.orderId;
  }

  getAmount(): Money {
    return this.amount;
  }

  getMethod(): PaymentMethod {
    return this.method;
  }

  getPaymentMethodToken(): string | undefined {
    return this.paymentMethodToken;
  }

  getPaymentMethodBrand(): string | undefined {
    return this.paymentMethodBrand;
  }

  getCustomerId(): string | undefined {
    return this.customerId;
  }

  getProcessedRefundIds(): string[] {
    return Array.from(this.processedRefundIds);
  }
}
