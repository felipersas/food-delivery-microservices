import { describe, test, expect, beforeEach } from 'bun:test';
import { InMemoryUserRepository } from '../../src/infra/database/memory/user.repository';
import { User } from '../../src/domain/aggregates/user.aggregate';

describe('InMemoryUserRepository', () => {
  let repo: InMemoryUserRepository;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
  });

  test('should save and find user by id', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    await repo.save(user);
    const found = await repo.findById(user.getId());

    expect(found).not.toBeNull();
    expect(found?.getId()).toBe(user.getId());
  });

  test('should find user by email', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    await repo.save(user);
    const found = await repo.findByEmail('test@example.com');

    expect(found).not.toBeNull();
    expect(found?.getEmail()).toBe('test@example.com');
  });

  test('should return null for non-existent user', async () => {
    const found = await repo.findById('non-existent');
    expect(found).toBeNull();
  });

  test('should check if email exists', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    await repo.save(user);

    expect(await repo.existsByEmail('test@example.com')).toBe(true);
    expect(await repo.existsByEmail('other@example.com')).toBe(false);
  });

  test('should delete user', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'Password123',
    });

    await repo.save(user);
    await repo.delete(user.getId());

    const found = await repo.findById(user.getId());
    expect(found).toBeNull();
  });

  test('should return all users', async () => {
    const user1 = await User.create({
      email: 'test1@example.com',
      password: 'Password123',
    });
    const user2 = await User.create({
      email: 'test2@example.com',
      password: 'Password123',
    });

    await repo.save(user1);
    await repo.save(user2);

    const users = await repo.findAll();
    expect(users).toHaveLength(2);
  });
});
