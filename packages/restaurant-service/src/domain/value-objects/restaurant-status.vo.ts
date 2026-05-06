import { ValueObject, DomainException } from '@app/shared';

export enum RestaurantStatusEnum {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
  CLOSED = 'closed',
}

export class RestaurantStatus extends ValueObject<{ value: RestaurantStatusEnum }> {
  private constructor(value: RestaurantStatusEnum) {
    super({ value });
  }

  static pending(): RestaurantStatus {
    return new RestaurantStatus(RestaurantStatusEnum.PENDING);
  }

  static active(): RestaurantStatus {
    return new RestaurantStatus(RestaurantStatusEnum.ACTIVE);
  }

  static suspended(): RestaurantStatus {
    return new RestaurantStatus(RestaurantStatusEnum.SUSPENDED);
  }

  static inactive(): RestaurantStatus {
    return new RestaurantStatus(RestaurantStatusEnum.INACTIVE);
  }

  static closed(): RestaurantStatus {
    return new RestaurantStatus(RestaurantStatusEnum.CLOSED);
  }

  static fromString(value: string): RestaurantStatus {
    if (!Object.values(RestaurantStatusEnum).includes(value as RestaurantStatusEnum)) {
      throw new DomainException(`Invalid restaurant status: ${value}`);
    }
    return new RestaurantStatus(value as RestaurantStatusEnum);
  }

  get enumValue(): RestaurantStatusEnum {
    return this.props.value;
  }

  canTransitionTo(newStatus: RestaurantStatus): boolean {
    const transitions: Record<RestaurantStatusEnum, RestaurantStatusEnum[]> = {
      [RestaurantStatusEnum.PENDING]: [
        RestaurantStatusEnum.ACTIVE,
        RestaurantStatusEnum.INACTIVE,
        RestaurantStatusEnum.CLOSED,
      ],
      [RestaurantStatusEnum.ACTIVE]: [
        RestaurantStatusEnum.SUSPENDED,
        RestaurantStatusEnum.INACTIVE,
        RestaurantStatusEnum.CLOSED,
      ],
      [RestaurantStatusEnum.SUSPENDED]: [
        RestaurantStatusEnum.ACTIVE,
        RestaurantStatusEnum.INACTIVE,
        RestaurantStatusEnum.CLOSED,
      ],
      [RestaurantStatusEnum.INACTIVE]: [
        RestaurantStatusEnum.ACTIVE,
        RestaurantStatusEnum.CLOSED,
      ],
      [RestaurantStatusEnum.CLOSED]: [
        RestaurantStatusEnum.ACTIVE,
        RestaurantStatusEnum.INACTIVE,
      ],
    };

    return transitions[this.props.value]?.includes(newStatus.props.value) ?? false;
  }

  isActive(): boolean {
    return this.props.value === RestaurantStatusEnum.ACTIVE;
  }

  isPending(): boolean {
    return this.props.value === RestaurantStatusEnum.PENDING;
  }

  isSuspended(): boolean {
    return this.props.value === RestaurantStatusEnum.SUSPENDED;
  }

  isInactive(): boolean {
    return this.props.value === RestaurantStatusEnum.INACTIVE;
  }

  isClosed(): boolean {
    return this.props.value === RestaurantStatusEnum.CLOSED;
  }

  canAcceptOrders(): boolean {
    return this.props.value === RestaurantStatusEnum.ACTIVE;
  }
}
