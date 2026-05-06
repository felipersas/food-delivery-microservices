import type { Repository } from '@app/shared';
import { User } from '../aggregates/user.aggregate';
import { UserRoleEnum } from '../value-objects/user-role.vo';

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
}
