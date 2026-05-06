export interface PriceUpdatedEvent {
  eventId: string;
  eventType: 'price-updated';
  occurredAt: string;
  aggregateId: string;
  aggregateType: 'MenuItem';
  data: {
    menuItemId: string;
    restaurantId: string;
    oldPriceCents: number;
    newPriceCents: number;
    available: boolean;
    name: string;
  };
}
