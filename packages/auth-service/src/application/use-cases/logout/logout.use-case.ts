import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import type { EventPublisher } from '@app/messaging';
import { LogoutDto, LogoutOutput } from './logout.dto';
import { USER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class LogoutUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(input: LogoutDto): Promise<LogoutOutput> {
    // Find user with this refresh token
    const users = await this.repo.findAll();
    let user: User | null = null;

    for (const u of users) {
      const tokens = u.getRefreshTokens();
      const found = tokens.find((t) => t.token === input.refreshToken);
      if (found) {
        user = u;
        break;
      }
    }

    if (user) {
      // Remove the refresh token
      user.removeRefreshToken(input.refreshToken);

      // Save
      await this.repo.save(user);

      // Publish events (if any)
      const events = user.getDomainEvents();
      if (events.length > 0) {
        await this.publisher.publishAll(events);
        user.clearDomainEvents();
      }
    }

    return { success: true };
  }
}
