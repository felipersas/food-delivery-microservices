import { describe, test, expect } from 'bun:test';
import { UserStatus, UserStatusEnum } from '../../src/domain/value-objects/user-status.vo';

describe('UserStatus Value Object', () => {
  test('should create status values', () => {
    const pending = UserStatus.pending();
    const active = UserStatus.active();
    const suspended = UserStatus.suspended();
    const inactive = UserStatus.inactive();

    expect(pending.value).toBe(UserStatusEnum.PENDING);
    expect(active.value).toBe(UserStatusEnum.ACTIVE);
    expect(suspended.value).toBe(UserStatusEnum.SUSPENDED);
    expect(inactive.value).toBe(UserStatusEnum.INACTIVE);
  });

  test('should check if status can login', () => {
    const active = UserStatus.active();
    const pending = UserStatus.pending();
    const suspended = UserStatus.suspended();

    expect(active.canLogin()).toBe(true);
    expect(pending.canLogin()).toBe(false);
    expect(suspended.canLogin()).toBe(false);
  });

  test('should check if status is active', () => {
    const active = UserStatus.active();
    const inactive = UserStatus.inactive();

    expect(active.isActive()).toBe(true);
    expect(inactive.isActive()).toBe(false);
  });

  test('should validate status transitions', () => {
    const pending = UserStatus.pending();
    const active = UserStatus.active();
    const suspended = UserStatus.suspended();
    const inactive = UserStatus.inactive();

    // Valid transitions from PENDING
    expect(pending.canTransitionTo(UserStatus.active())).toBe(true);
    expect(pending.canTransitionTo(UserStatus.inactive())).toBe(true);
    expect(pending.canTransitionTo(UserStatus.suspended())).toBe(false);

    // Valid transitions from ACTIVE
    expect(active.canTransitionTo(UserStatus.suspended())).toBe(true);
    expect(active.canTransitionTo(UserStatus.inactive())).toBe(true);
    expect(active.canTransitionTo(UserStatus.pending())).toBe(false);

    // Valid transitions from SUSPENDED
    expect(suspended.canTransitionTo(UserStatus.active())).toBe(true);
    expect(suspended.canTransitionTo(UserStatus.inactive())).toBe(true);
  });
});
