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

  constructor(props: {
    id?: string;
    orderId: string;
    amount: Money;
    method: PaymentMethod;
    paymentMethodToken?: string;
    paymentMethodBrand?: string;
    customerId?: string;
    refundedAmount?: Money;
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
    });
    (payment as any).status = props.status;
    for (let i = 0; i < props.version; i++) {
      payment.incrementVersion();
    }
    return payment;
  }

  confirm(): void {
    if (this.status !== PaymentStatus.PENDING) {
      throw new InvalidStateException(`Cannot confirm payment in ${this.status} status`);
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

  refund(amount: Money, reason: string): void {
    if (this.status !== PaymentStatus.CONFIRMED && this.status !== PaymentStatus.PARTIALLY_REFUNDED) {
      throw new InvalidStateException(`Cannot refund payment in ${this.status} status`);
    }

    const refundableAmount = this.getRefundableAmount();
    if (amount.amount > refundableAmount.amount) {
      throw new InvalidStateException(
        `Refund amount ${amount.amount} exceeds refundable amount ${refundableAmount.amount}`,
      );
    }

    this.refundedAmount = this.refundedAmount.add(amount);

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
        refundedAmount: amount.amount,
        refundId: uuidv4(),
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
}
