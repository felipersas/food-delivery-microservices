import type { DomainEvent } from '../../domain/domain-event';

export interface EventPublisher {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}
