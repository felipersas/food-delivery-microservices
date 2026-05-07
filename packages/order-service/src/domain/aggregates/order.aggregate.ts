import { AggregateRoot, Money, DomainException } from '@app/shared';
import { OrderStatus, OrderStatusEnum } from '@domain/value-objects/order-status.vo';
import { OrderItem } from '@domain/value-objects/order-item.vo';
import { v4 as uuidv4 } from 'uuid';

export class Order extends AggregateRoot<string> {
  private customerId: string;
  private restaurantId: string;
  private items: OrderItem[];
  private status: OrderStatus;
  private totalAmount: Money;
  private paymentMethodIndex?: number;
  private paymentMethodType?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH';

  constructor(props: {
    id?: string;
    customerId: string;
    restaurantId: string;
    items: OrderItem[];
    paymentMethodIndex?: number;
    paymentMethodType?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH';
  }) {
    super(props.id ?? uuidv4());
    this.customerId = props.customerId;
    this.restaurantId = props.restaurantId;
    this.items = props.items;
    this.status = OrderStatus.pending();
    this.totalAmount = this.calculateTotal();
    this.paymentMethodIndex = props.paymentMethodIndex;
    this.paymentMethodType = props.paymentMethodType;
  }

  static reconstitute(props: {
    id: string;
    customerId: string;
    restaurantId: string;
    items: OrderItem[];
    status: OrderStatusEnum;
    totalAmount: Money;
    version: number;
    paymentMethodIndex?: number;
    paymentMethodType?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH';
  }): Order {
    const order = new Order({
      id: props.id,
      customerId: props.customerId,
      restaurantId: props.restaurantId,
      items: props.items,
      paymentMethodIndex: props.paymentMethodIndex,
      paymentMethodType: props.paymentMethodType,
    });
    order.setRawState('status', new OrderStatus(props.status));
    order.setRawState('totalAmount', props.totalAmount);
    for (let i = 0; i < props.version; i++) {
      order.incrementVersion();
    }
    return order;
  }

  static create(props: {
    customerId: string;
    restaurantId: string;
    items: OrderItem[];
    paymentMethodIndex?: number;
    paymentMethodType?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'PIX' | 'CASH';
  }): Order {
    if (props.items.length === 0) {
      throw new DomainException('Order must have at least one item');
    }

    const order = new Order(props);

    // Validate total amount is positive
    if (order.totalAmount.amount <= 0) {
      throw new DomainException(`Order total must be greater than zero, got: ${order.totalAmount.amount}`);
    }

    order.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'order.created',
      occurredAt: new Date().toISOString(),
      aggregateId: order.getId(),
      aggregateType: 'Order',
      data: {
        orderId: order.getId(),
        customerId: order.customerId,
        restaurantId: order.restaurantId,
        items: order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          priceCents: item.unitPrice.cents,
        })),
        totalAmountCents: order.totalAmount.cents,
        paymentMethodIndex: order.paymentMethodIndex,
        paymentMethodType: order.paymentMethodType,
      },
    });

    return order;
  }

  confirm(): void {

    if (this.paymentMethodIndex === undefined || this.paymentMethodIndex === null || !this.paymentMethodType) {
      throw new DomainException('Order cannot be confirmed without payment method');
    }
    this.transitionTo(OrderStatus.confirmed());
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'order.confirmed',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Order',
      data: {
        orderId: this.getId(),
        restaurantId: this.restaurantId,
        confirmedAt: new Date().toISOString(),
        items: this.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
        })),
      },
    });
  }

  startPreparing(): void {
    this.transitionTo(OrderStatus.preparing());
  }

  markReady(): void {
    this.transitionTo(OrderStatus.ready());
  }

  complete(): void {
    this.transitionTo(OrderStatus.delivered());
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'order.completed',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Order',
      data: {
        orderId: this.getId(),
        customerId: this.customerId,
        restaurantId: this.restaurantId,
        totalAmountCents: this.totalAmount.cents,
        completedAt: new Date().toISOString(),
      },
    });
  }

  cancel(): void {
    this.transitionTo(OrderStatus.cancelled());
  }

  getStatus(): OrderStatusEnum {
    return this.status.value;
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getRestaurantId(): string {
    return this.restaurantId;
  }

  getItems(): OrderItem[] {
    return [...this.items];
  }

  getTotalAmount(): Money {
    return this.totalAmount;
  }

  getPaymentMethodIndex(): number | undefined {
    return this.paymentMethodIndex;
  }

  getPaymentMethodType(): string | undefined {
    return this.paymentMethodType;
  }

  private transitionTo(newStatus: OrderStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Cannot transition from ${this.status.value} to ${newStatus.value}`,
      );
    }
    this.status = newStatus;
    this.incrementVersion();
  }

  private calculateTotal(): Money {
    const total = this.items.reduce(
      (sum, item) => {
        const itemTotal = Money.BRL(item.unitPrice.amount * item.quantity);
        return sum.add(itemTotal);
      },
      Money.BRL(0),
    );

    if (total.amount <= 0) {
      throw new DomainException('Order total must be greater than zero');
    }

    return total;
  }
}
