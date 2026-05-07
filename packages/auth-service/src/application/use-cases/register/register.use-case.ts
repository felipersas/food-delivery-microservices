import { Injectable, Inject } from '@nestjs/common';
import type { UserRepository } from '../../../domain/repositories/user.repository.interface';
import type { EventPublisher } from '@app/shared';
import { User } from '../../../domain/aggregates/user.aggregate';
import { RegisterDto } from './register.dto';
import type { RegisterOutput } from './register.dto';
import { USER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class RegisterUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(input: RegisterDto): Promise<RegisterOutput> {
    // Check if email already exists
    const exists = await this.repo.existsByEmail(input.email);
    if (exists) {
      throw new Error('Email already registered');
    }

    // Create user
    const user = await User.create({
      email: input.email,
      password: input.password,
      roles: input.roles,
    });

    // Save
    await this.repo.save(user);

    // Publish events
    const events = user.getDomainEvents();
    await this.publisher.publishAll(events);
    user.clearDomainEvents();

    return {
      userId: user.getId(),
      email: user.getEmail(),
      roles: user.getRoles(),
    };
  }
}
