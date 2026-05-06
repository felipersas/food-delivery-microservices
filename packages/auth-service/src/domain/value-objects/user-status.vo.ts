import { ValueObject } from '@app/shared';

export enum UserStatusEnum {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive',
}

export class UserStatus extends ValueObject<UserStatusEnum> {
  protected constructor(value: UserStatusEnum) {
    super(value);
  }

  static pending(): UserStatus {
    return new UserStatus(UserStatusEnum.PENDING);
  }

  static active(): UserStatus {
    return new UserStatus(UserStatusEnum.ACTIVE);
  }

  static suspended(): UserStatus {
    return new UserStatus(UserStatusEnum.SUSPENDED);
  }

  static inactive(): UserStatus {
    return new UserStatus(UserStatusEnum.INACTIVE);
  }

  canTransitionTo(target: UserStatus): boolean {
    const transitions: Record<UserStatusEnum, UserStatusEnum[]> = {
      [UserStatusEnum.PENDING]: [UserStatusEnum.ACTIVE, UserStatusEnum.INACTIVE],
      [UserStatusEnum.ACTIVE]: [UserStatusEnum.SUSPENDED, UserStatusEnum.INACTIVE],
      [UserStatusEnum.SUSPENDED]: [UserStatusEnum.ACTIVE, UserStatusEnum.INACTIVE],
      [UserStatusEnum.INACTIVE]: [UserStatusEnum.PENDING, UserStatusEnum.ACTIVE],
    };
    return transitions[this.value]?.includes(target.value) ?? false;
  }

  get value(): UserStatusEnum {
    return this.props;
  }

  getName(): string {
    return this.props;
  }

  isActive(): boolean {
    return this.value === UserStatusEnum.ACTIVE;
  }

  canLogin(): boolean {
    return this.value === UserStatusEnum.ACTIVE;
  }

  static reconstitute(value: UserStatusEnum): UserStatus {
    return new UserStatus(value);
  }
}
