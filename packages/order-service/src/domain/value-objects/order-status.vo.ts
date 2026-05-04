import { ValueObject } from '@app/shared';

export enum OrderStatusEnum {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
}

export class OrderStatus extends ValueObject<{ status: OrderStatusEnum }> {
  get value(): OrderStatusEnum {
    return this.props.status;
  }

  static pending(): OrderStatus {
    return new OrderStatus({ status: OrderStatusEnum.PENDING });
  }

  static confirmed(): OrderStatus {
    return new OrderStatus({ status: OrderStatusEnum.CONFIRMED });
  }

  static preparing(): OrderStatus {
    return new OrderStatus({ status: OrderStatusEnum.PREPARING });
  }

  static ready(): OrderStatus {
    return new OrderStatus({ status: OrderStatusEnum.READY });
  }

  static cancelled(): OrderStatus {
    return new OrderStatus({ status: OrderStatusEnum.CANCELLED });
  }

  canTransitionTo(target: OrderStatus): boolean {
    const transitions: Record<OrderStatusEnum, OrderStatusEnum[]> = {
      [OrderStatusEnum.PENDING]: [OrderStatusEnum.CONFIRMED, OrderStatusEnum.CANCELLED],
      [OrderStatusEnum.CONFIRMED]: [OrderStatusEnum.PREPARING, OrderStatusEnum.CANCELLED],
      [OrderStatusEnum.PREPARING]: [OrderStatusEnum.READY],
      [OrderStatusEnum.READY]: [OrderStatusEnum.DELIVERED],
      [OrderStatusEnum.DELIVERED]: [],
      [OrderStatusEnum.CANCELLED]: [],
    };
    return transitions[this.value]?.includes(target.value) ?? false;
  }
}
