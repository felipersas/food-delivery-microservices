import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import type { EventPublisher } from '@app/messaging';
import { UpdateUserDto, UpdateUserOutput } from './update-user.dto';
import { USER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class UpdateUserUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(userId: string, input: UpdateUserDto): Promise<UpdateUserOutput> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.updateProfile(input);

    await this.repo.save(user);

    const events = user.getDomainEvents();
    if (events.length > 0) {
      await this.publisher.publishAll(events);
      user.clearDomainEvents();
    }

    return {
      id: user.getId(),
      email: user.getEmail(),
      roles: user.getRoles(),
      status: user.getStatus(),
    };
  }
}
