import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { UserRepository } from '@domain/repositories/user.repository.interface';
import type { EventPublisher } from '@infra/messaging/rabbitmq/auth-event.publisher';
import {
  UserStatus,
  UserStatusEnum,
} from '@domain/value-objects/user-status.vo';
import { ChangeStatusDto } from './change-status.dto';
import type { ChangeStatusOutput } from './change-status.dto';
import { USER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class ChangeStatusUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(
    userId: string,
    input: ChangeStatusDto,
  ): Promise<ChangeStatusOutput> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const newStatus = UserStatus.reconstitute(input.status);

    if (input.status === UserStatusEnum.SUSPENDED) {
      user.suspend(input.reason);
    } else if (input.status === UserStatusEnum.ACTIVE) {
      user.activate();
    } else if (input.status === UserStatusEnum.INACTIVE) {
      user.deactivate();
    }

    await this.repo.save(user);

    const events = user.getDomainEvents();
    if (events.length > 0) {
      await this.publisher.publishAll(events);
      user.clearDomainEvents();
    }

    return {
      id: user.getId(),
      status: user.getStatus(),
    };
  }
}
