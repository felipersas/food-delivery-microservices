import { AggregateRoot } from '@app/shared';
import { v4 as uuidv4 } from 'uuid';

export enum KitchenTicketStatus {
  WAITING = 'WAITING',
  PREPARING = 'PREPARING',
  READY = 'READY',
}

export class KitchenTicket extends AggregateRoot<string> {
  private orderId: string;
  private items: Array<{ productId: string; productName: string; quantity: number }>;
  private status: KitchenTicketStatus;

  constructor(props: {
    id?: string;
    orderId: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
  }) {
    super(props.id ?? uuidv4());
    this.orderId = props.orderId;
    this.items = props.items;
    this.status = KitchenTicketStatus.WAITING;
  }

  static createFromOrder(data: {
    orderId: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
  }): KitchenTicket {
    return new KitchenTicket(data);
  }

  static reconstitute(props: {
    id: string;
    orderId: string;
    items: Array<{ productId: string; productName: string; quantity: number }>;
    status: KitchenTicketStatus;
    version: number;
  }): KitchenTicket {
    const ticket = new KitchenTicket({
      id: props.id,
      orderId: props.orderId,
      items: props.items,
    });
    (ticket as any).status = props.status;
    for (let i = 0; i < props.version; i++) {
      ticket.incrementVersion();
    }
    return ticket;
  }

  startPreparing(): void {
    if (this.status !== KitchenTicketStatus.WAITING) {
      throw new Error(`Cannot start preparing from ${this.status}`);
    }
    this.status = KitchenTicketStatus.PREPARING;
    this.incrementVersion();
  }

  markReady(): void {
    if (this.status !== KitchenTicketStatus.PREPARING) {
      throw new Error(`Cannot mark ready from ${this.status}`);
    }
    this.status = KitchenTicketStatus.READY;
    this.incrementVersion();
  }

  getStatus(): KitchenTicketStatus {
    return this.status;
  }

  getOrderId(): string {
    return this.orderId;
  }

  getItems(): Array<{ productId: string; productName: string; quantity: number }> {
    return [...this.items];
  }
}
