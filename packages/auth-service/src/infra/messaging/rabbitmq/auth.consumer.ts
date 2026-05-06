import { Injectable, Inject } from '@nestjs/common';
import type { RabbitMQConnection } from '@app/messaging';
import type { UserRepository } from '../../../../domain/repositories/user.repository.interface';
import type { DomainEvent } from '@app/shared';
import { RABBITMQ_CONNECTION, USER_REPOSITORY } from '../../../tokens';

@Injectable()
export class AuthConsumer {
  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    @Inject(USER_REPOSITORY) private readonly repo: UserRepository,
  ) {}

  async start(): Promise<void> {
    // Auth service mainly publishes events, but can listen if needed
    // For now, this is a placeholder for future event subscriptions
  }
}
