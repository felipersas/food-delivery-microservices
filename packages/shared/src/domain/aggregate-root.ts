import type { DomainEvent } from './domain-event';
import { Entity } from './entity';

export abstract class AggregateRoot<TId> extends Entity<TId> {
  private domainEvents: DomainEvent[] = [];
  private version = 0;

  protected addDomainEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }

  getDomainEvents(): ReadonlyArray<DomainEvent> {
    return this.domainEvents;
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }

  getVersion(): number {
    return this.version;
  }

  incrementVersion(): void {
    this.version++;
  }
}
