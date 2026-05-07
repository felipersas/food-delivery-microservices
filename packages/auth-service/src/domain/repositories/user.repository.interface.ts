import type { Repository } from '@app/shared';
import { UserRoleEnum } from '@app/shared';
import { User } from '../aggregates/user.aggregate';

export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
  existsByEmail(email: string): Promise<boolean>;
  findByRefreshToken(token: string): Promise<User[]>;
}
