import { AggregateRoot, Money } from '@app/shared';
import { v4 as uuidv4 } from 'uuid';

export enum PaymentStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  REJECTED = 'REJECTED',
}

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  PIX = 'PIX',
}

export class Payment extends AggregateRoot<string> {
  private orderId: string;
  private amount: Money;
  private method: PaymentMethod;
  private status: PaymentStatus;

  constructor(props: {
    id?: string;
    orderId: string;
    amount: Money;
    method: PaymentMethod;
  }) {
    super(props.id ?? uuidv4());
    this.orderId = props.orderId;
    this.amount = props.amount;
    this.method = props.method;
    this.status = PaymentStatus.PENDING;
  }

  confirm(): void {
    if (this.status !== PaymentStatus.PENDING) {
      throw new Error(`Cannot confirm payment in ${this.status} status`);
    }
    this.status = PaymentStatus.CONFIRMED;
    this.incrementVersion();
  }

  reject(_reason: string): void {
    if (this.status !== PaymentStatus.PENDING) {
      throw new Error(`Cannot reject payment in ${this.status} status`);
    }
    this.status = PaymentStatus.REJECTED;
    this.incrementVersion();
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
}
