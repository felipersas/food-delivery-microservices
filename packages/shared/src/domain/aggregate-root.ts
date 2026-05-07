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

  /**
   * Protected method for reconstitution - bypasses invariants.
   * Should ONLY be called from static reconstitute() methods.
   *
   * @example
   * static reconstitute(props: {...}): Order {
   *   const order = new Order({...});
   *   order.setRawState('status', new OrderStatus(props.status));
   *   order.setRawState('totalAmount', props.totalAmount);
   *   return order;
   * }
   */
  protected setRawState<T>(key: string, value: T): void {
    (this as any)[key] = value;
  }
}
