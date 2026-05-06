/**
 * User roles for authorization across all microservices
 *
 * Shared enum to ensure consistency across services
 */
export enum UserRoleEnum {
  CUSTOMER = 'customer',
  RESTAURANT = 'restaurant',
  DELIVERY = 'delivery',
  ADMIN = 'admin',
}

/**
 * Type guard for checking if a value is a valid UserRole
 */
export function isUserRole(value: string): value is UserRoleEnum {
  return Object.values(UserRoleEnum).includes(value as UserRoleEnum);
}

/**
 * Get all roles as string array
 */
export function getAllRoles(): string[] {
  return Object.values(UserRoleEnum);
}
