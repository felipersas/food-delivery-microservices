import { Injectable } from '@nestjs/common';
import type { UserRepository } from '../../../domain/repositories/user.repository.interface';
import { User } from '../../../domain/aggregates/user.aggregate';

@Injectable()
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email.toLowerCase());
    if (!userId) return null;
    return this.users.get(userId) ?? null;
  }

  async existsByEmail(email: string): Promise<boolean> {
    return this.emailIndex.has(email.toLowerCase());
  }

  async save(user: User): Promise<void> {
    const id = user.getId();
    const existingUser = await this.findById(id);

    if (existingUser) {
      // Update email index if email changed
      if (existingUser.getEmail() !== user.getEmail()) {
        this.emailIndex.delete(existingUser.getEmail().toLowerCase());
      }
    }

    this.users.set(id, user);
    this.emailIndex.set(user.getEmail().toLowerCase(), id);
  }

  async delete(id: string): Promise<void> {
    const user = await this.findById(id);
    if (!user) return;

    this.users.delete(id);
    this.emailIndex.delete(user.getEmail().toLowerCase());
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values());
  }
}
