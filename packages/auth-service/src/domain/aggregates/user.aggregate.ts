import { AggregateRoot, DomainException, UserRoleEnum } from '@app/shared';
import { Email } from '../value-objects/email.vo';
import { HashedPassword } from '../value-objects/hashed-password.vo';
import { UserRole } from '../value-objects/user-role.vo';
import { UserStatus, UserStatusEnum } from '../value-objects/user-status.vo';
import { RefreshToken } from '../value-objects/refresh-token.vo';
import { v4 as uuidv4 } from 'uuid';

export interface CreateUserProps {
  email: string;
  password: string;
  roles?: UserRoleEnum[];
}

export interface UserProfileProps {
  email?: string;
}

const MAX_REFRESH_TOKENS = 5;

export class User extends AggregateRoot<string> {
  private email: Email;
  private password: HashedPassword;
  private roles: UserRole[];
  private status: UserStatus;
  private refreshTokens: RefreshToken[];
  private lastLoginAt?: Date;
  private createdAt: Date;
  private updatedAt: Date;

  private constructor(props: {
    id?: string;
    email: Email;
    password: HashedPassword;
    roles?: UserRole[];
    status?: UserStatus;
    refreshTokens?: RefreshToken[];
    lastLoginAt?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    super(props.id ?? uuidv4());
    this.email = props.email;
    this.password = props.password;
    this.roles = props.roles ?? [];
    this.status = props.status ?? UserStatus.pending();
    this.refreshTokens = props.refreshTokens ?? [];
    this.lastLoginAt = props.lastLoginAt;
    this.createdAt = props.createdAt ?? new Date();
    this.updatedAt = props.updatedAt ?? new Date();
  }

  static async create(props: CreateUserProps): Promise<User> {
    const email = Email.create(props.email);
    const password = await HashedPassword.fromPlain(props.password);

    const roles = props.roles?.map((role) => {
      if (role === UserRoleEnum.ADMIN) {
        throw new DomainException(
          'Cannot create user with ADMIN role directly',
        );
      }
      return UserRole.fromString(role);
    }) ?? [UserRole.customer()];

    const user = new User({
      email,
      password,
      roles,
      status: UserStatus.active(),
    });

    user.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'user.created',
      occurredAt: new Date().toISOString(),
      aggregateId: user.getId(),
      aggregateType: 'User',
      data: {
        userId: user.getId(),
        email: user.getEmail(),
        roles: user.getRoles(),
      },
    });

    return user;
  }

  static reconstitute(props: {
    id: string;
    email: string;
    passwordHash: string;
    roles: UserRoleEnum[];
    status: UserStatusEnum;
    refreshTokens: Array<{
      token: string;
      deviceId: string;
      expiresAt: Date;
      createdAt: Date;
    }>;
    lastLoginAt?: Date;
    version: number;
    createdAt: Date;
    updatedAt: Date;
  }): User {
    const email = Email.create(props.email);
    const password = HashedPassword.create(props.passwordHash);
    const status = UserStatus.reconstitute(props.status);
    const roles = props.roles.map((role) => UserRole.fromString(role));
    const refreshTokens = props.refreshTokens.map((rt) =>
      RefreshToken.reconstitute(rt),
    );

    const user = new User({
      id: props.id,
      email,
      password,
      roles,
      status,
      refreshTokens,
      lastLoginAt: props.lastLoginAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    });

    for (let i = 0; i < props.version; i++) {
      user.incrementVersion();
    }

    return user;
  }

  async login(deviceId: string): Promise<void> {
    if (!this.status.canLogin()) {
      throw new DomainException(
        `Cannot login user with status ${this.status.getName()}`,
      );
    }

    this.lastLoginAt = new Date();
    this.markAsUpdated();
    this.incrementVersion();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'user.logged-in',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'User',
      data: {
        userId: this.getId(),
        deviceId,
      },
    });
  }

  async changePassword(newPassword: string): Promise<void> {
    this.password = await HashedPassword.fromPlain(newPassword);
    this.revokeAllRefreshTokens();
    this.markAsUpdated();
    this.incrementVersion();
  }

  addRefreshToken(token: RefreshToken): void {
    // Remove expired tokens first
    this.refreshTokens = this.refreshTokens.filter((rt) => rt.isValid());

    // If at max capacity, remove oldest
    if (this.refreshTokens.length >= MAX_REFRESH_TOKENS) {
      this.refreshTokens.sort(
        (a, b) => a.createdAt.getTime() - b.createdAt.getTime(),
      );
      this.refreshTokens.shift();
    }

    this.refreshTokens.push(token);
    this.markAsUpdated();
    this.incrementVersion();
  }

  removeRefreshToken(token: string): void {
    this.refreshTokens = this.refreshTokens.filter((rt) => rt.token !== token);
    this.markAsUpdated();
    this.incrementVersion();
  }

  revokeAllRefreshTokens(): void {
    this.refreshTokens = [];
    this.markAsUpdated();
    this.incrementVersion();

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'user.logged-out',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'User',
      data: {
        userId: this.getId(),
      },
    });
  }

  cleanupExpiredTokens(): void {
    const beforeLength = this.refreshTokens.length;
    this.refreshTokens = this.refreshTokens.filter((rt) => rt.isValid());

    if (this.refreshTokens.length !== beforeLength) {
      this.markAsUpdated();
      this.incrementVersion();
    }
  }

  updateProfile(props: UserProfileProps): void {
    if (props.email) {
      this.email = Email.create(props.email);
    }
    this.markAsUpdated();
    this.incrementVersion();
  }

  activate(): void {
    this.transitionTo(UserStatus.active());

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'user.activated',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'User',
      data: {
        userId: this.getId(),
      },
    });
  }

  suspend(reason?: string): void {
    this.transitionTo(UserStatus.suspended());

    this.addDomainEvent({
      eventId: uuidv4(),
      eventType: 'user.suspended',
      occurredAt: new Date().toISOString(),
      aggregateId: this.getId(),
      aggregateType: 'User',
      data: {
        userId: this.getId(),
        reason: reason ?? 'No reason provided',
      },
    });
  }

  deactivate(): void {
    this.transitionTo(UserStatus.inactive());
    this.revokeAllRefreshTokens();
  }

  addRole(role: UserRoleEnum): void {
    if (role === UserRoleEnum.ADMIN) {
      throw new DomainException('Cannot add ADMIN role');
    }

    if (this.hasRole(role)) {
      return;
    }

    this.roles.push(UserRole.fromString(role));
    this.markAsUpdated();
    this.incrementVersion();
  }

  removeRole(role: UserRoleEnum): void {
    if (role === UserRoleEnum.ADMIN) {
      throw new DomainException('Cannot remove ADMIN role');
    }

    const initialLength = this.roles.length;
    this.roles = this.roles.filter((r) => r.value !== role);

    if (this.roles.length === 0) {
      throw new DomainException('User must have at least one role');
    }

    if (this.roles.length !== initialLength) {
      this.markAsUpdated();
      this.incrementVersion();
    }
  }

  // Getters
  getId(): string {
    return super.getId();
  }

  getEmail(): string {
    return this.email.getEmail();
  }

  getPasswordHash(): string {
    return this.password.getHash();
  }

  getRoles(): UserRoleEnum[] {
    return this.roles.map((r) => r.value);
  }

  getStatus(): UserStatusEnum {
    return this.status.value;
  }

  getRefreshTokens(): RefreshToken[] {
    return [...this.refreshTokens];
  }

  getLastLoginAt(): Date | undefined {
    return this.lastLoginAt;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  hasRole(role: UserRoleEnum): boolean {
    return this.roles.some((r) => r.value === role);
  }

  hasAnyRole(roles: UserRoleEnum[]): boolean {
    return roles.some((role) => this.hasRole(role));
  }

  // Private methods
  private transitionTo(newStatus: UserStatus): void {
    if (!this.status.canTransitionTo(newStatus)) {
      throw new DomainException(
        `Cannot transition from ${this.status.getName()} to ${newStatus.getName()}`,
      );
    }
    this.status = newStatus;
    this.markAsUpdated();
    this.incrementVersion();
  }

  private markAsUpdated(): void {
    this.updatedAt = new Date();
  }
}
