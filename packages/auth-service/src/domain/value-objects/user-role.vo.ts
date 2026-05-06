import { ValueObject } from '@app/shared';

export enum UserRoleEnum {
  CUSTOMER = 'customer',
  RESTAURANT = 'restaurant',
  DELIVERY = 'delivery',
  ADMIN = 'admin',
}

export class UserRole extends ValueObject<UserRoleEnum> {
  protected constructor(value: UserRoleEnum) {
    super(value);
  }

  static customer(): UserRole {
    return new UserRole(UserRoleEnum.CUSTOMER);
  }

  static restaurant(): UserRole {
    return new UserRole(UserRoleEnum.RESTAURANT);
  }

  static delivery(): UserRole {
    return new UserRole(UserRoleEnum.DELIVERY);
  }

  static admin(): UserRole {
    return new UserRole(UserRoleEnum.ADMIN);
  }

  static fromString(value: string): UserRole {
    const validRoles = Object.values(UserRoleEnum);
    if (!validRoles.includes(value as UserRoleEnum)) {
      throw new Error(`Invalid role: ${value}`);
    }
    return new UserRole(value as UserRoleEnum);
  }

  get value(): UserRoleEnum {
    return this.props;
  }

  getName(): string {
    return this.props;
  }
}
