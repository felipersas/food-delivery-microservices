import { AggregateRoot, DomainException } from '@app/shared';
import { RestaurantStatus, RestaurantStatusEnum } from '../value-objects/restaurant-status.vo';
import { RestaurantAddress } from '../value-objects/restaurant-address.vo';
import { OperatingHours } from '../value-objects/operating-hours.vo';
import { v4 as uuidv4 } from 'uuid';

export class Restaurant extends AggregateRoot<string> {
  private ownerId: string;
  private name: string;
  private description: string;
  private address: RestaurantAddress;
  private phone: string;
  private email: string;
  private operatingHours: OperatingHours[];
  private status: RestaurantStatus;
  private averageRating: number;
  private totalRatings: number;
  private deliveryFeeCents: number;
  private minOrderCents: number;
  private estimatedPrepTimeMinutes: number;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id?: string;
    ownerId: string;
    name: string;
    description: string;
    address: RestaurantAddress;
    phone: string;
    email: string;
    operatingHours: OperatingHours[];
    status?: RestaurantStatus;
    averageRating?: number;
    totalRatings?: number;
    deliveryFeeCents?: number;
    minOrderCents?: number;
    estimatedPrepTimeMinutes?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(props.id ?? uuidv4());
    this.ownerId = props.ownerId;
    this.name = props.name;
    this.description = props.description;
    this.address = props.address;
    this.phone = props.phone;
    this.email = props.email;
    this.operatingHours = props.operatingHours;
    this.status = props.status ?? RestaurantStatus.pending();
    this.averageRating = props.averageRating ?? 0;
    this.totalRatings = props.totalRatings ?? 0;
    this.deliveryFeeCents = props.deliveryFeeCents ?? 0;
    this.minOrderCents = props.minOrderCents ?? 0;
    this.estimatedPrepTimeMinutes = props.estimatedPrepTimeMinutes ?? 30;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static reconstitute(props: {
    id: string;
    ownerId: string;
    name: string;
    description: string;
    address: RestaurantAddress;
    phone: string;
    email: string;
    operatingHours: OperatingHours[];
    status: RestaurantStatusEnum;
    averageRating: number;
    totalRatings: number;
    deliveryFeeCents: number;
    minOrderCents: number;
    estimatedPrepTimeMinutes: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): Restaurant {
    const restaurant = new Restaurant({
      id: props.id,
      ownerId: props.ownerId,
      name: props.name,
      description: props.description,
      address: props.address,
      phone: props.phone,
      email: props.email,
      operatingHours: props.operatingHours,
      averageRating: props.averageRating,
      totalRatings: props.totalRatings,
      deliveryFeeCents: props.deliveryFeeCents,
      minOrderCents: props.minOrderCents,
      estimatedPrepTimeMinutes: props.estimatedPrepTimeMinutes,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
    (restaurant as any).status = RestaurantStatus.fromString(props.status);
    for (let i = 0; i < props.version; i++) {
      restaurant.incrementVersion();
    }
    return restaurant;
  }

  static create(props: {
    ownerId: string;
    name: string;
    description: string;
    address: RestaurantAddress;
    phone: string;
    email: string;
    operatingHours: OperatingHours[];
    deliveryFeeCents?: number;
    minOrderCents?: number;
    estimatedPrepTimeMinutes?: number;
  }): Restaurant {
    Restaurant.validateName(props.name);
    Restaurant.validatePhone(props.phone);
    Restaurant.validateEmail(props.email);
    Restaurant.validateOperatingHours(props.operatingHours);

    const restaurant = new Restaurant(props);

    restaurant.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'restaurant.created',
      occurredAt: new Date().toISOString(),
      aggregateId: restaurant.getId(),
      aggregateType: 'Restaurant',
      data: {
        restaurantId: restaurant.getId(),
        ownerId: restaurant.ownerId,
        name: restaurant.name,
        address: {
          street: restaurant.address.street,
          number: restaurant.address.number,
          neighborhood: restaurant.address.neighborhood,
          city: restaurant.address.city,
          state: restaurant.address.state,
        },
        phone: restaurant.phone,
        email: restaurant.email,
        deliveryFeeCents: restaurant.deliveryFeeCents,
        minOrderCents: restaurant.minOrderCents,
      },
    });

    return restaurant;
  }

  activate(): void {
    this.transitionTo(RestaurantStatus.active());
    this.markAsUpdated();
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'restaurant.activated',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Restaurant',
      data: {
        restaurantId: this.getId(),
        name: this.name,
      },
    });
  }

  suspend(reason?: string): void {
    this.transitionTo(RestaurantStatus.suspended());
    this.markAsUpdated();
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'restaurant.suspended',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Restaurant',
      data: {
        restaurantId: this.getId(),
        reason,
      },
    });
  }

  deactivate(): void {
    this.transitionTo(RestaurantStatus.inactive());
    this.markAsUpdated();
  }

  close(): void {
    this.transitionTo(RestaurantStatus.closed());
    this.markAsUpdated();
  }

  updateProfile(props: {
    name?: string;
    description?: string;
    phone?: string;
    email?: string;
    deliveryFeeCents?: number;
    minOrderCents?: number;
    estimatedPrepTimeMinutes?: number;
  }): void {
    if (props.name) {
      Restaurant.validateName(props.name);
      this.name = props.name;
    }
    if (props.description !== undefined) {
      this.description = props.description;
    }
    if (props.phone) {
      Restaurant.validatePhone(props.phone);
      this.phone = props.phone;
    }
    if (props.email) {
      Restaurant.validateEmail(props.email);
      this.email = props.email;
    }
    if (props.deliveryFeeCents !== undefined) {
      if (props.deliveryFeeCents < 0) {
        throw new DomainException('Delivery fee cannot be negative');
      }
      this.deliveryFeeCents = props.deliveryFeeCents;
    }
    if (props.minOrderCents !== undefined) {
      if (props.minOrderCents < 0) {
        throw new DomainException('Minimum order cannot be negative');
      }
      this.minOrderCents = props.minOrderCents;
    }
    if (props.estimatedPrepTimeMinutes !== undefined) {
      if (props.estimatedPrepTimeMinutes < 1) {
        throw new DomainException('Estimated prep time must be at least 1 minute');
      }
      this.estimatedPrepTimeMinutes = props.estimatedPrepTimeMinutes;
    }

    this.markAsUpdated();
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'restaurant.updated',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'Restaurant',
      data: {
        restaurantId: this.getId(),
        changedFields: Object.keys(props),
      },
    });
  }

  updateAddress(address: RestaurantAddress): void {
    this.address = address;
    this.markAsUpdated();
    this.incrementVersion();
  }

  updateOperatingHours(operatingHours: OperatingHours[]): void {
    Restaurant.validateOperatingHours(operatingHours);
    this.operatingHours = operatingHours;
    this.markAsUpdated();
    this.incrementVersion();
  }

  isOpenNow(): boolean {
    const now = new Date();
    return this.operatingHours.some((hours) => hours.isOpenAt(now));
  }

  addRating(rating: number): void {
    if (rating < 1 || rating > 5) {
      throw new DomainException('Rating must be between 1 and 5');
    }

    const totalRatingScore = this.averageRating * this.totalRatings;
    this.totalRatings++;
    this.averageRating = (totalRatingScore + rating) / this.totalRatings;
    this.averageRating = Math.round(this.averageRating * 100) / 100; // Round to 2 decimal places

    this.incrementVersion();
  }

  // Getters
  getOwnerId(): string {
    return this.ownerId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getAddress(): RestaurantAddress {
    return this.address;
  }

  getPhone(): string {
    return this.phone;
  }

  getEmail(): string {
    return this.email;
  }

  getOperatingHours(): OperatingHours[] {
    return [...this.operatingHours];
  }

  getStatus(): RestaurantStatusEnum {
    return this.status.enumValue;
  }

  getAverageRating(): number {
    return this.averageRating;
  }

  getTotalRatings(): number {
    return this.totalRatings;
  }

  getDeliveryFeeCents(): number {
    return this.deliveryFeeCents;
  }

  getMinOrderCents(): number {
    return this.minOrderCents;
  }

  getEstimatedPrepTimeMinutes(): number {
    return this.estimatedPrepTimeMinutes;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  private transitionTo(newStatus: RestaurantStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Cannot transition from ${this.status.enumValue} to ${newStatus.enumValue}`,
      );
    }
    this.status = newStatus;
    this.incrementVersion();
  }

  private markAsUpdated(): void {
    this.updatedAt = new Date();
    this.incrementVersion();
  }

  private static validateName(name: string): void {
    if (!name || name.trim().length === 0) {
      throw new DomainException('Name is required');
    }
    if (name.length > 100) {
      throw new DomainException('Name must be less than 100 characters');
    }
  }

  private static validatePhone(phone: string): void {
    const phoneRegex = /^\+?\d{10,15}$/;
    if (!phoneRegex.test(phone)) {
      throw new DomainException('Invalid phone number format. Use country code + numbers only.');
    }
  }

  private static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new DomainException('Invalid email format');
    }
  }

  private static validateOperatingHours(hours: OperatingHours[]): void {
    if (!hours || hours.length === 0) {
      throw new DomainException('At least one operating hour range is required');
    }
  }
}
