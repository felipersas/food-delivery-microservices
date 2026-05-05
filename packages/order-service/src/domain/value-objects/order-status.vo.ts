import { ValueObject } from '@app/shared';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class OrderStatus extends ValueObject<OrderStatusEnum> {
  static pending(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PENDING);
  }

  static confirmed(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.CONFIRMED);
  }

  static preparing(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PREPARING);
  }

  static ready(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.READY);
  }

  static delivered(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.DELIVERED);
  }

  static cancelled(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.CANCELLED);
  }

  canTransitionTo(target: OrderStatus): boolean {
    const transitions: Record<OrderStatusEnum, OrderStatusEnum[]> = {
      [OrderStatusEnum.PENDING]: [OrderStatusEnum.CONFIRMED, OrderStatusEnum.CANCELLED],
      [OrderStatusEnum.CONFIRMED]: [OrderStatusEnum.PREPARING, OrderStatusEnum.READY, OrderStatusEnum.CANCELLED],
      [OrderStatusEnum.PREPARING]: [OrderStatusEnum.READY],
      [OrderStatusEnum.READY]: [OrderStatusEnum.DELIVERED],
      [OrderStatusEnum.DELIVERED]: [],
      [OrderStatusEnum.CANCELLED]: [],
    };
    return transitions[this.value]?.includes(target.value) ?? false;
  }
}
