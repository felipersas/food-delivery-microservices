import { describe, test, expect } from 'bun:test';
import { UserRole } from '../../src/domain/value-objects/user-role.vo';
import { UserRoleEnum } from '@app/shared';

describe('UserRole Value Object', () => {
  test('should create role values', () => {
    const customer = UserRole.customer();
    const restaurant = UserRole.restaurant();
    const delivery = UserRole.delivery();
    const admin = UserRole.admin();

    expect(customer.value).toBe(UserRoleEnum.CUSTOMER);
    expect(restaurant.value).toBe(UserRoleEnum.RESTAURANT);
    expect(delivery.value).toBe(UserRoleEnum.DELIVERY);
    expect(admin.value).toBe(UserRoleEnum.ADMIN);
  });

  test('should create role from string', () => {
    const customer = UserRole.fromString('customer');
    const restaurant = UserRole.fromString('restaurant');

    expect(customer.value).toBe(UserRoleEnum.CUSTOMER);
    expect(restaurant.value).toBe(UserRoleEnum.RESTAURANT);
  });

  test('should throw on invalid role string', () => {
    expect(() => UserRole.fromString('invalid')).toThrow('Invalid role');
  });

  test('should get role name', () => {
    const customer = UserRole.customer();
    expect(customer.getName()).toBe('customer');
  });
});
