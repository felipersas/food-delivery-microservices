import { describe, test, expect } from 'bun:test';
import { User } from '../../src/domain/aggregates/user.aggregate';
import { UserRoleEnum } from '../../src/domain/value-objects/user-role.vo';
import { UserStatusEnum } from '../../src/domain/value-objects/user-status.vo';
import { DomainException } from '@app/shared';

describe('User Aggregate', () => {
  test('should create user with default customer role', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    expect(user.getId()).toBeDefined();
    expect(user.getEmail()).toBe('test@example.com');
    expect(user.getRoles()).toEqual([UserRoleEnum.CUSTOMER]);
    expect(user.getStatus()).toBe(UserStatusEnum.ACTIVE);
  });

  test('should create user with specified roles', async () => {
    const user = await User.create({
      email: 'restaurant@example.com',
      password: 'Password123',
      roles: [UserRoleEnum.RESTAURANT],
    });

    expect(user.getRoles()).toEqual([UserRoleEnum.RESTAURANT]);
  });

  test('should not allow creating user with ADMIN role', async () => {
    await expect(
      User.create({
        email: 'admin@example.com',
        password: 'Password123',
        roles: [UserRoleEnum.ADMIN],
      }),
    ).rejects.toThrow(DomainException);
  });

  test('should reject weak password', async () => {
    await expect(
      User.create({
        email: 'test@example.com',
        password: 'weak',
      }),
    ).rejects.toThrow();
  });

  test('should add domain event on creation', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    const events = user.getDomainEvents();
    expect(events).toHaveLength(1);
    expect(events[0].eventType).toBe('user.created');
  });

  test('should record login', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    await user.login('device-123');

    expect(user.getLastLoginAt()).toBeInstanceOf(Date);
    const events = user.getDomainEvents();
    expect(events.some((e) => e.eventType === 'user.logged-in')).toBe(true);
  });

  test('should not allow login when suspended', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    user.suspend();

    await expect(user.login('device-123')).rejects.toThrow(DomainException);
  });

  test('should add refresh token', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    const token = {
      token: 'uuid-123',
      deviceId: 'device-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      matchesDeviceId: () => true,
    } as any;

    user.addRefreshToken(token);
    expect(user.getRefreshTokens()).toHaveLength(1);
  });

  test('should remove refresh token', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    const token = {
      token: 'uuid-123',
      deviceId: 'device-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as any;

    user.addRefreshToken(token);
    user.removeRefreshToken('uuid-123');
    expect(user.getRefreshTokens()).toHaveLength(0);
  });

  test('should revoke all refresh tokens', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    const token = {
      token: 'uuid-123',
      deviceId: 'device-123',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
    } as any;

    user.addRefreshToken(token);
    user.revokeAllRefreshTokens();
    expect(user.getRefreshTokens()).toHaveLength(0);
  });

  test('should change password', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    const oldHash = user.getPasswordHash();
    await user.changePassword('NewPassword456');
    expect(user.getPasswordHash()).not.toBe(oldHash);
  });

  test('should check if user has role', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
      roles: [UserRoleEnum.RESTAURANT],
    });

    expect(user.hasRole(UserRoleEnum.RESTAURANT)).toBe(true);
    expect(user.hasRole(UserRoleEnum.CUSTOMER)).toBe(false);
  });
});
