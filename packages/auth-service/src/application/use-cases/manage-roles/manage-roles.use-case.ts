import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import type { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import type { EventPublisher } from '@app/messaging';
import { UserRoleEnum } from '../../../../domain/value-objects/user-role.vo';
import { ManageRolesDto, ManageRolesOutput } from './manage-roles.dto';
import { USER_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class ManageRolesUseCase {
  constructor(
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(userId: string, input: ManageRolesDto): Promise<ManageRolesOutput> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const action = input.action ?? 'add';

    if (action === 'add') {
      user.addRole(input.role);
    } else {
      user.removeRole(input.role);
    }

    await this.repo.save(user);

    const events = user.getDomainEvents();
    if (events.length > 0) {
      await this.publisher.publishAll(events);
      user.clearDomainEvents();
    }

    return {
      id: user.getId(),
      roles: user.getRoles(),
    };
  }
}
