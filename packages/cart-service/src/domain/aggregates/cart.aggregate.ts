import { v4 as uuidv4 } from 'uuid';
import {
  AggregateRoot,
  DomainException,
  InvalidStateException,
  ResourceNotFoundException,
  Money,
} from '@app/shared';
import { CartItem } from '../value-objects/cart-item.vo';
import { CartStatus, CartStatusEnum } from '../value-objects/cart-status.vo';

export interface CartItemEntityProps {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  restaurantId: string;
}

export class Cart extends AggregateRoot<string> {
  private customerId: string;
  private restaurantId: string | null;
  private items: CartItem[];
  private totalAmount: Money;
  private status: CartStatus;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id?: string;
    customerId: string;
    restaurantId: string | null;
    items: CartItem[];
    status: CartStatus;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(props.id ?? uuidv4());
    this.customerId = props.customerId;
    this.restaurantId = props.restaurantId;
    this.items = props.items;
    this.status = props.status;
    this.totalAmount = this.calculateTotal();
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static create(customerId: string): Cart {
    const cart = new Cart({
      customerId,
      restaurantId: null,
      items: [],
      status: CartStatus.active(),
    });

    cart.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'cart.created',
      occurredAt: new Date().toISOString(),
      aggregateId: cart.getId(),
      aggregateType: 'Cart',
      data: {
        cartId: cart.getId(),
        customerId: cart.customerId,
      },
    });

    return cart;
  }

  static reconstitute(props: {
    id: string;
    customerId: string;
    restaurantId: string | null;
    items: CartItemEntityProps[];
    status: CartStatusEnum;
    totalAmountCents: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): Cart {
    const items = props.items.map((item) =>
      CartItem.create({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Money.BRLFromCents(item.unitPriceCents),
        restaurantId: item.restaurantId,
      }),
    );

    const cart = new Cart({
      id: props.id,
      customerId: props.customerId,
      restaurantId: props.restaurantId,
      items,
      status: CartStatus.fromString(props.status),
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });

    for (let i = 0; i < props.version; i++) {
      cart.incrementVersion();
    }

    return cart;
  }

  addItem(item: CartItem): void {
    if (this.status.enumValue !== CartStatusEnum.ACTIVE) {
      throw new InvalidStateException('Cannot add items to a non-active cart');
    }

    // Single restaurant rule
    if (this.restaurantId === null) {
      this.restaurantId = item.restaurantId;
    } else if (this.restaurantId !== item.restaurantId) {
      throw new DomainException('Cart can only contain items from one restaurant');
    }

    // Check if item already exists - if so, update quantity
    const existingIndex = this.items.findIndex((i) => i.productId === item.productId);
    if (existingIndex >= 0) {
      const existing = this.items[existingIndex];
      const newQuantity = existing.quantity + item.quantity;
      if (newQuantity > 99) {
        throw new DomainException('Quantity cannot exceed 99');
      }
      this.items[existingIndex] = existing.withQuantity(newQuantity);
    } else {
      this.items.push(item);
    }

    this.totalAmount = this.calculateTotal();
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'cart.item-added',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Cart',
      data: {
        cartId: this.getId(),
        customerId: this.customerId,
        productId: item.productId,
        quantity: item.quantity,
        restaurantId: item.restaurantId,
      },
    });
  }

  removeItem(productId: string): void {
    if (this.status.enumValue !== CartStatusEnum.ACTIVE) {
      throw new InvalidStateException('Cannot remove items from a non-active cart');
    }

    const index = this.items.findIndex((i) => i.productId === productId);
    if (index < 0) {
      throw new ResourceNotFoundException('CartItem', productId);
    }

    this.items.splice(index, 1);

    if (this.items.length === 0) {
      this.restaurantId = null;
    }

    this.totalAmount = this.calculateTotal();
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'cart.item-removed',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Cart',
      data: {
        cartId: this.getId(),
        customerId: this.customerId,
        productId,
      },
    });
  }

  updateItemQuantity(productId: string, quantity: number): void {
    if (this.status.enumValue !== CartStatusEnum.ACTIVE) {
      throw new InvalidStateException('Cannot update items in a non-active cart');
    }

    if (quantity <= 0) {
      throw new DomainException('Quantity must be positive');
    }
    if (quantity > 99) {
      throw new DomainException('Quantity cannot exceed 99');
    }

    const index = this.items.findIndex((i) => i.productId === productId);
    if (index < 0) {
      throw new ResourceNotFoundException('CartItem', productId);
    }

    const existing = this.items[index];
    this.items[index] = existing.withQuantity(quantity);

    this.totalAmount = this.calculateTotal();
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'cart.item-updated',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Cart',
      data: {
        cartId: this.getId(),
        customerId: this.customerId,
        productId,
        quantity,
      },
    });
  }

  clear(): void {
    if (this.status.enumValue !== CartStatusEnum.ACTIVE) {
      throw new InvalidStateException('Cannot clear a non-active cart');
    }

    this.items = [];
    this.restaurantId = null;
    this.totalAmount = Money.BRL(0);
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'cart.cleared',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Cart',
      data: {
        cartId: this.getId(),
        customerId: this.customerId,
      },
    });
  }

  checkout(): void {
    if (this.isEmpty()) {
      throw new DomainException('Cannot checkout an empty cart');
    }

    const newStatus = CartStatus.checkedOut();
    this.status.transitionTo(newStatus);

    this.status = newStatus;
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'cart.checked-out',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Cart',
      data: {
        cartId: this.getId(),
        customerId: this.customerId,
        restaurantId: this.restaurantId!,
        items: this.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          priceCents: item.unitPrice.cents,
        })),
        totalAmountCents: this.totalAmount.cents,
      },
    });
  }

  abandon(): void {
    const newStatus = CartStatus.abandoned();
    this.status.transitionTo(newStatus);

    this.status = newStatus;
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'cart.abandoned',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Cart',
      data: {
        cartId: this.getId(),
        customerId: this.customerId,
      },
    });
  }

  // Getters (return copies for arrays)
  getId(): string {
    return super.getId();
  }

  getCustomerId(): string {
    return this.customerId;
  }

  getRestaurantId(): string | null {
    return this.restaurantId;
  }

  getItems(): CartItem[] {
    return [...this.items];
  }

  getTotalAmount(): Money {
    return this.totalAmount;
  }

  getStatus(): CartStatusEnum {
    return this.status.enumValue;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  getVersion(): number {
    return super.getVersion();
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  isActive(): boolean {
    return this.status.enumValue === CartStatusEnum.ACTIVE;
  }

  private calculateTotal(): Money {
    const total = this.items.reduce(
      (sum, item) => sum.add(item.getTotal()),
      Money.BRL(0),
    );
    return total;
  }

  private markAsUpdated(): void {
    this.updatedAt = new Date();
    this.incrementVersion();
  }
}
