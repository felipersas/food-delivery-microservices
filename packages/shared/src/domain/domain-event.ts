export interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  aggregateId: string;
  aggregateType: string;
  data: unknown;
}
