import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, Repository as TypeORMRepository } from 'typeorm';
import type { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import { User } from '../../../../domain/aggregates/user.aggregate';
import { UserEntity } from '../entities/user.entity';
import { RefreshTokenEntity } from '../entities/refresh-token.entity';

@Injectable()
export class PostgresUserRepository implements UserRepository {
  private userRepo: TypeORMRepository<UserEntity>;
  private refreshTokenRepo: TypeORMRepository<RefreshTokenEntity>;

  constructor(@InjectDataSource() private dataSource: DataSource) {
    this.userRepo = this.dataSource.getRepository(UserEntity);
    this.refreshTokenRepo = this.dataSource.getRepository(RefreshTokenEntity);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) return null;

    const refreshTokens = await this.refreshTokenRepo.find({
      where: { userId: id },
      order: { createdAt: 'DESC' },
    });

    return this.mapToDomain(user, refreshTokens);
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.userRepo.findOne({
      where: { email: email.toLowerCase() },
    });
    if (!user) return null;

    const refreshTokens = await this.refreshTokenRepo.find({
      where: { userId: user.id },
      order: { createdAt: 'DESC' },
    });

    return this.mapToDomain(user, refreshTokens);
  }

  async existsByEmail(email: string): Promise<boolean> {
    const count = await this.userRepo.count({
      where: { email: email.toLowerCase() },
    });
    return count > 0;
  }

  async save(user: User): Promise<void> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const userEntity = this.mapToEntity(user);
      await queryRunner.manager.save(userEntity);

      // Delete old refresh tokens
      await queryRunner.manager.delete(RefreshTokenEntity, {
        userId: user.getId(),
      });

      // Insert new refresh tokens
      for (const rt of user.getRefreshTokens()) {
        const rtEntity = RefreshTokenEntity.create({
          userId: user.getId(),
          token: rt.token,
          deviceId: rt.deviceId,
          expiresAt: rt.expiresAt,
        });
        await queryRunner.manager.save(rtEntity);
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async delete(id: string): Promise<void> {
    await this.userRepo.delete({ id });
    await this.refreshTokenRepo.delete({ userId: id });
  }

  async findAll(): Promise<User[]> {
    const users = await this.userRepo.find();
    const result: User[] = [];

    for (const user of users) {
      const refreshTokens = await this.refreshTokenRepo.find({
        where: { userId: user.id },
      });
      result.push(this.mapToDomain(user, refreshTokens));
    }

    return result;
  }

  private mapToDomain(
    user: UserEntity,
    refreshTokens: RefreshTokenEntity[],
  ): User {
    return User.reconstitute({
      id: user.id,
      email: user.email,
      passwordHash: user.passwordHash,
      roles: user.roles as any,
      status: user.status as any,
      refreshTokens: refreshTokens.map((rt) => ({
        token: rt.token,
        deviceId: rt.deviceId,
        expiresAt: rt.expiresAt,
        createdAt: rt.createdAt,
      })),
      lastLoginAt: user.lastLoginAt ?? undefined,
      version: user.version,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    });
  }

  private mapToEntity(user: User): UserEntity {
    const entity = new UserEntity();
    entity.id = user.getId();
    entity.email = user.getEmail();
    entity.passwordHash = user.getPasswordHash();
    entity.roles = user.getRoles();
    entity.status = user.getStatus();
    entity.lastLoginAt = user.getLastLoginAt() ?? null;
    entity.version = user.getVersion();
    entity.createdAt = user.getCreatedAt();
    entity.updatedAt = user.getUpdatedAt();
    return entity;
  }
}
