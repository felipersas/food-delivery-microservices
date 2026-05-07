import { AggregateRoot, InvalidStateException } from '@app/shared';
import { v4 as uuidv4 } from 'uuid';

export enum KitchenTicketStatus {
  WAITING = 'WAITING',
  PREPARING = 'PREPARING',
  READY = 'READY',
}

export class KitchenTicket extends AggregateRoot<string> {
  private orderId: string;
  private restaurantId: string;
  private items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
  private status: KitchenTicketStatus;
  private createdAt: Date;
  private updatedAt: Date;

  constructor(props: {
    id?: string;
    orderId: string;
    restaurantId: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
  }) {
    super(props.id ?? uuidv4());
    this.orderId = props.orderId;
    this.restaurantId = props.restaurantId;
    this.items = props.items;
    this.status = KitchenTicketStatus.WAITING;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  static createFromOrder(data: {
    orderId: string;
    restaurantId: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
  }): KitchenTicket {
    return new KitchenTicket(data);
  }

  static reconstitute(props: {
    id: string;
    orderId: string;
    restaurantId: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
    status: KitchenTicketStatus;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): KitchenTicket {
    const ticket = new KitchenTicket({
      id: props.id,
      orderId: props.orderId,
      restaurantId: props.restaurantId,
      items: props.items,
    });
    ticket.setRawState('status', props.status);
    ticket.setRawState('createdAt', props.createdAt);
    ticket.setRawState('updatedAt', props.updatedAt);
    for (let i = 0; i < props.version; i++) {
      ticket.incrementVersion();
    }
    return ticket;
  }

  startPreparing(): void {
    if (this.status !== KitchenTicketStatus.WAITING) {
      throw new InvalidStateException(
        `Cannot start preparing from ${this.status}`,
      );
    }
    this.status = KitchenTicketStatus.PREPARING;
    this.markAsUpdated();
    this.incrementVersion();
  }

  markReady(): void {
    if (this.status !== KitchenTicketStatus.PREPARING) {
      throw new InvalidStateException(`Cannot mark ready from ${this.status}`);
    }
    this.status = KitchenTicketStatus.READY;
    this.markAsUpdated();
    this.incrementVersion();
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'order.ready',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'KitchenTicket',
      data: {
        orderId: this.orderId,
        kitchenTicketId: this.getId(),
        readyAt: new Date().toISOString(),
      },
    });
  }

  getStatus(): KitchenTicketStatus {
    return this.status;
  }

  getOrderId(): string {
    return this.orderId;
  }

  getRestaurantId(): string {
    return this.restaurantId;
  }

  getItems(): Array<{
    productId: string;
    productName: string;
    quantity: number;
  }> {
    return [...this.items];
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private markAsUpdated(): void {
    this.updatedAt = new Date();
  }
}
