import { ValueObject } from '@app/shared';

export enum CustomerStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export class CustomerStatus extends ValueObject<CustomerStatusEnum> {
  static active(): CustomerStatus {
    return new CustomerStatus(CustomerStatusEnum.ACTIVE);
  }

  static inactive(): CustomerStatus {
    return new CustomerStatus(CustomerStatusEnum.INACTIVE);
  }

  static suspended(): CustomerStatus {
    return new CustomerStatus(CustomerStatusEnum.SUSPENDED);
  }

  canTransitionTo(target: CustomerStatus): boolean {
    const transitions: Record<CustomerStatusEnum, CustomerStatusEnum[]> = {
      [CustomerStatusEnum.ACTIVE]: [CustomerStatusEnum.INACTIVE, CustomerStatusEnum.SUSPENDED],
      [CustomerStatusEnum.INACTIVE]: [CustomerStatusEnum.ACTIVE],
      [CustomerStatusEnum.SUSPENDED]: [CustomerStatusEnum.ACTIVE, CustomerStatusEnum.INACTIVE],
    };
    return transitions[this.value]?.includes(target.value) ?? false;
  }
}
