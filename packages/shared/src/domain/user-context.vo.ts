/**
 * User Context value object
 *
 * Represents authenticated user information propagated from API Gateway
 * to microservices via HTTP headers during request forwarding.
 */
import { ValueObject } from '@app/shared';
import { UserRoleEnum, isUserRole } from '../types/user-roles';

export interface UserContextProps {
  userId: string;
  email: string;
  roles: UserRoleEnum[];
}

/**
 * User context extracted from JWT and forwarded via headers
 *
 * Used in microservices to access authenticated user information
 * without requiring additional database lookups.
 */
export class UserContext extends ValueObject<UserContextProps> {
  private constructor(props: UserContextProps) {
    super(props);
  }

  /**
   * Create UserContext from forwarded headers
   *
   * @throws {Error} If required headers are missing or invalid
   */
  static fromHeaders(headers: Record<string, string | undefined>): UserContext {
    const userId = headers['x-user-id'];
    const email = headers['x-user-email'];
    const rolesHeader = headers['x-user-role'];

    if (!userId) {
      throw new Error('Missing X-User-ID header');
    }
    if (!email) {
      throw new Error('Missing X-User-Email header');
    }
    if (!rolesHeader) {
      throw new Error('Missing X-User-Role header');
    }

    // Parse roles from comma-separated string
    const roles = rolesHeader.split(',').filter(Boolean).map((role) => {
      if (!isUserRole(role)) {
        throw new Error(`Invalid role: ${role}`);
      }
      return role as UserRoleEnum;
    });

    return new UserContext({ userId, email, roles });
  }

  /**
   * Create UserContext directly (for testing)
   */
  static create(props: UserContextProps): UserContext {
    return new UserContext(props);
  }

  get userId(): string {
    return this.props.userId;
  }

  get email(): string {
    return this.props.email;
  }

  get roles(): UserRoleEnum[] {
    return this.props.roles;
  }

  /**
   * Check if user has any of the specified roles
   */
  hasAnyRole(...roles: UserRoleEnum[]): boolean {
    return roles.some((role) => this.props.roles.includes(role));
  }

  /**
   * Check if user has all of the specified roles
   */
  hasAllRoles(...roles: UserRoleEnum[]): boolean {
    return roles.every((role) => this.props.roles.includes(role));
  }

  /**
   * Check if user is admin
   */
  isAdmin(): boolean {
    return this.props.roles.includes(UserRoleEnum.ADMIN);
  }

  /**
   * Check if user has specific role
   */
  hasRole(role: UserRoleEnum): boolean {
    return this.props.roles.includes(role);
  }
}
