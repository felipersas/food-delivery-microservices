import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { UserRepository } from '@domain/repositories/user.repository.interface';
import type { GetCurrentUserOutput } from './get-current-user.dto';
import { USER_REPOSITORY } from '@tokens/tokens';

@Injectable()
export class GetCurrentUserUseCase {
  constructor(@Inject(USER_REPOSITORY) private readonly repo: UserRepository) {}

  async execute(userId: string): Promise<GetCurrentUserOutput> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.getId(),
      email: user.getEmail(),
      roles: user.getRoles(),
      status: user.getStatus(),
      lastLoginAt: user.getLastLoginAt()?.toISOString(),
      createdAt: user.getCreatedAt().toISOString(),
    };
  }
}
