import { AggregateRoot, DomainException, Money } from '@app/shared';
import { MenuItemCategory, MenuItemCategoryEnum } from '../value-objects/menu-item-category.vo';
import { v4 as uuidv4 } from 'uuid';

export class MenuItem extends AggregateRoot<string> {
  private restaurantId: string;
  private name: string;
  private description: string;
  private price: Money;
  private category: MenuItemCategory;
  private imageUrl: string | null;
  private available: boolean;
  private preparationTimeMinutes: number;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id?: string;
    restaurantId: string;
    name: string;
    description: string;
    price: Money;
    category: MenuItemCategory;
    imageUrl?: string | null;
    available?: boolean;
    preparationTimeMinutes?: number;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(props.id ?? uuidv4());
    this.restaurantId = props.restaurantId;
    this.name = props.name;
    this.description = props.description;
    this.price = props.price;
    this.category = props.category;
    this.imageUrl = props.imageUrl ?? null;
    this.available = props.available ?? true;
    this.preparationTimeMinutes = props.preparationTimeMinutes ?? 15;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static reconstitute(props: {
    id: string;
    restaurantId: string;
    name: string;
    description: string;
    priceCents: number;
    category: MenuItemCategoryEnum;
    imageUrl: string | null;
    available: boolean;
    preparationTimeMinutes: number;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): MenuItem {
    const item = new MenuItem({
      id: props.id,
      restaurantId: props.restaurantId,
      name: props.name,
      description: props.description,
      price: Money.BRLFromCents(props.priceCents),
      category: MenuItemCategory.fromString(props.category),
      imageUrl: props.imageUrl,
      available: props.available,
      preparationTimeMinutes: props.preparationTimeMinutes,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });
    for (let i = 0; i < props.version; i++) {
      item.incrementVersion();
    }
    return item;
  }

  static create(props: {
    restaurantId: string;
    name: string;
    description: string;
    priceAmount: number;
    category: MenuItemCategoryEnum;
    imageUrl?: string | null;
    preparationTimeMinutes?: number;
  }): MenuItem {
    MenuItem.validateName(props.name);
    MenuItem.validateDescription(props.description);
    MenuItem.validatePriceAmount(props.priceAmount);
    MenuItem.validatePreparationTime(props.preparationTimeMinutes ?? 15);

    const price = Money.BRL(props.priceAmount);
    const category = MenuItemCategory.fromString(props.category);

    const item = new MenuItem({
      restaurantId: props.restaurantId,
      name: props.name,
      description: props.description,
      price,
      category,
      imageUrl: props.imageUrl ?? null,
      available: true,
      preparationTimeMinutes: props.preparationTimeMinutes ?? 15,
    });

    item.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'menu-item.created',
      occurredAt: new Date().toISOString(),
      aggregateId: item.getId(),
      aggregateType: 'MenuItem',
      data: {
        menuItemId: item.getId(),
        restaurantId: item.restaurantId,
        name: item.name,
        category: item.category.enumValue,
        priceCents: item.price.cents,
      },
    });

    return item;
  }

  updateDetails(props: {
    name?: string;
    description?: string;
    imageUrl?: string | null;
    preparationTimeMinutes?: number;
  }): void {
    if (props.name) {
      MenuItem.validateName(props.name);
      this.name = props.name;
    }
    if (props.description !== undefined) {
      MenuItem.validateDescription(props.description);
      this.description = props.description;
    }
    if (props.imageUrl !== undefined) {
      this.imageUrl = props.imageUrl;
    }
    if (props.preparationTimeMinutes !== undefined) {
      MenuItem.validatePreparationTime(props.preparationTimeMinutes);
      this.preparationTimeMinutes = props.preparationTimeMinutes;
    }

    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'menu-item.updated',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'MenuItem',
      data: {
        menuItemId: this.getId(),
        restaurantId: this.restaurantId,
        changedFields: Object.keys(props),
      },
    });
  }

  updatePrice(priceAmount: number): void {
    MenuItem.validatePriceAmount(priceAmount);

    this.price = Money.BRL(priceAmount);
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'menu-item.updated',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'MenuItem',
      data: {
        menuItemId: this.getId(),
        restaurantId: this.restaurantId,
        changedFields: ['price'],
        newPriceCents: this.price.cents,
      },
    });
  }

  updateCategory(category: MenuItemCategoryEnum): void {
    this.category = MenuItemCategory.fromString(category);
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'menu-item.updated',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'MenuItem',
      data: {
        menuItemId: this.getId(),
        restaurantId: this.restaurantId,
        changedFields: ['category'],
        newCategory: this.category.enumValue,
      },
    });
  }

  markAsUnavailable(): void {
    this.available = false;
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'menu-item.unavailable',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'MenuItem',
      data: {
        menuItemId: this.getId(),
        restaurantId: this.restaurantId,
        name: this.name,
      },
    });
  }

  markAsAvailable(): void {
    this.available = true;
    this.markAsUpdated();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'menu-item.available',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'MenuItem',
      data: {
        menuItemId: this.getId(),
        restaurantId: this.restaurantId,
        name: this.name,
      },
    });
  }

  delete(): void {
    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'menu-item.deleted',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'MenuItem',
      data: {
        menuItemId: this.getId(),
        restaurantId: this.restaurantId,
        name: this.name,
      },
    });
  }

  // Getters
  getRestaurantId(): string {
    return this.restaurantId;
  }

  getName(): string {
    return this.name;
  }

  getDescription(): string {
    return this.description;
  }

  getPrice(): Money {
    return this.price;
  }

  getPriceCents(): number {
    return this.price.cents;
  }

  getPriceAmount(): number {
    return this.price.amount;
  }

  getCategory(): MenuItemCategoryEnum {
    return this.category.enumValue;
  }

  getImageUrl(): string | null {
    return this.imageUrl;
  }

  isAvailable(): boolean {
    return this.available;
  }

  getPreparationTimeMinutes(): number {
    return this.preparationTimeMinutes;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
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

  private static validateDescription(description: string): void {
    if (description.length > 500) {
      throw new DomainException('Description must be less than 500 characters');
    }
  }

  private static validatePriceAmount(amount: number): void {
    if (amount <= 0) {
      throw new DomainException('Price must be greater than zero');
    }
    if (amount > 10000) {
      throw new DomainException('Price cannot exceed R$ 10,000');
    }
  }

  private static validatePreparationTime(minutes: number): void {
    if (minutes < 1) {
      throw new DomainException('Preparation time must be at least 1 minute');
    }
    if (minutes > 240) {
      throw new DomainException('Preparation time cannot exceed 240 minutes (4 hours)');
    }
  }
}
