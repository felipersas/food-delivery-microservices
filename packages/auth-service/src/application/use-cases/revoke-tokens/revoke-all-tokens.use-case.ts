import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import type { EventPublisher } from '@app/messaging';
import { RevokeTokensOutput } from './revoke-tokens.dto';
import { USER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class RevokeAllTokensUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(userId: string): Promise<RevokeTokensOutput> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const previousCount = user.getRefreshTokens().length;
    user.revokeAllRefreshTokens();

    await this.repo.save(user);

    const events = user.getDomainEvents();
    if (events.length > 0) {
      await this.publisher.publishAll(events);
      user.clearDomainEvents();
    }

    return {
      success: true,
      revokedCount: previousCount,
    };
  }
}
