import { AggregateRoot, Money } from '@app/shared';
import { OrderStatus, OrderStatusEnum } from '../value-objects/order-status.vo';
import { OrderItem } from '../value-objects/order-item.vo';
import { v4 as uuidv4 } from 'uuid';

export class Order extends AggregateRoot<string> {
  private customerId: string;
  private restaurantId: string;
  private items: OrderItem[];
  private status: OrderStatus;
  private totalAmount: Money;

  constructor(props: {
    id?: string;
    customerId: string;
    restaurantId: string;
    items: OrderItem[];
  }) {
    super(props.id ?? uuidv4());
    this.customerId = props.customerId;
    this.restaurantId = props.restaurantId;
    this.items = props.items;
    this.status = OrderStatus.pending();
    this.totalAmount = this.calculateTotal();
  }

  static create(props: {
    customerId: string;
    restaurantId: string;
    items: OrderItem[];
  }): Order {
    const order = new Order(props);

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
          price: item.unitPrice.amount,
        })),
        totalAmount: order.totalAmount.amount,
      },
    });

    return order;
  }

  confirm(): void {
    this.transitionTo(OrderStatus.confirmed());
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'order.confirmed',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Order',
      data: {
        orderId: this.getId(),
        confirmedAt: new Date().toISOString(),
      },
    });
  }

  startPreparing(): void {
    this.transitionTo(OrderStatus.preparing());
  }

  markReady(): void {
    this.transitionTo(OrderStatus.ready());
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

  private transitionTo(newStatus: OrderStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new Error(
        `Cannot transition from ${this.status.value} to ${newStatus.value}`,
      );
    }
    this.status = newStatus;
    this.incrementVersion();
  }

  private calculateTotal(): Money {
    return this.items.reduce(
      (total, item) => {
        const itemTotal = Money.BRL(item.unitPrice.amount * item.quantity);
        return total.add(itemTotal);
      },
      Money.BRL(0),
    );
  }
}
