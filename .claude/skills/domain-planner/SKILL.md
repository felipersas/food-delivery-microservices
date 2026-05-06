---
name: domain-planner
description: Plan domain models following DDD strategic patterns
triggers:
  - "plan domain"
  - "design aggregates"
  - "domain model"
  - "bounded context"
tags: [ddd, domain, planning]
---

# Domain Planner - DDD Strategic Design

## Bounded Context Identification

### Current Contexts
- **Order Context**: Order management, lifecycle, status
- **Kitchen Context**: Food preparation, tickets, queue
- **Payment Context**: Payment processing, transactions
- **Customer Context**: Customer profile, addresses, payment methods
- **Notification Context**: Event notifications (email/SMS)
- **Analytics Context**: Event consumption, metrics

### Proposed New Contexts
- **Restaurant Context**: Restaurant management, menu, availability
- **Delivery Context**: Delivery routing, tracking, driver management
- **Promotion Context**: Coupons, campaigns, discounts
- **Loyalty Context**: Points, rewards, tiers

## Aggregate Design Guidelines

### Aggregate Rules
1. **Consistency boundary** - all changes transactional
2. **One repository per aggregate**
3. **Reference by ID only** across aggregates
4. **Size limits** - prefer small, focused aggregates

### Aggregate Identification
```
Event storming questions:
- What business decisions need to be consistent?
- What invariants must be protected?
- What transactional boundaries exist?
```

### Root Entity Selection
- **Has global identity**
- **Controls access to members**
- **Ensures consistency**

## Value Object Identification

### When to Use Value Objects
- **No identity** - defined by attributes
- **Immutable** - replace on change
- **Reusable** - shared across aggregates
- **Validation encapsulated**

### Common Value Objects
- **Money**: Amount + currency
- **Address**: Street + city + state + zip
- **EmailAddress**: Validated email string
- **PhoneNumber**: Validated phone string
- **GeoLocation**: Lat + lng
- **TimeRange**: Start + end
- **Quantity**: Number + unit

### Value Object vs Primitive
```typescript
// ❌ Primitive
class Order {
  constructor(
    public amount: number,
    public currency: string
  ) {}
}

// ✅ Value Object
class Order {
  constructor(
    public totalAmount: Money
  ) {}
}
```

## Domain Event Design

### Event Format
```typescript
{
  eventId: string;        // Unique ID for this event
  eventType: string;      // aggregate.action (past tense)
  occurredAt: string;     // ISO timestamp
  aggregateId: string;    // Aggregate ID
  aggregateType: string;  // Aggregate class name
  data: { ... }          // Event payload
}
```

### Event Naming
- **Past tense**: `order.created`, `payment.confirmed`
- **Verb indicates state transition**: `order.ready` (not `order.is_ready`)
- **Namespace by aggregate**: `restaurant.menu.updated`

### When to Emit Events
1. **State change**: aggregate state transition
2. **Business decision**: important business action
3. **External notification**: other contexts need to know

### Event Payload Guidelines
- **Minimal data** - only what subscribers need
- **No derived data** - subscribers can calculate
- **Immutable** - never update event data

## Context Mapping

### Upstream/Downstream Relationships
```
Order (upstream) --[OHS: order.created]--> Payment (downstream)
Payment (upstream) --[OHS: payment.confirmed]--> Kitchen (downstream)
```

### Integration Patterns
- **OHS (Open Host Service)**: Published API/events for others
- **ACL (Anti-Corruption Layer)**: Translate external models
- **CON (Conformist)**: Adopt upstream model

### Cross-Aggregate References
```typescript
// ✅ Reference by ID
class Order {
  private restaurantId: string;  // ID only
}

// ❌ Direct reference
class Order {
  private restaurant: Restaurant;  // Wrong!
}
```

## Ubiquitous Language

### Terms to Define Per Context
- **Core domain concepts**
- **Business rules**
- **State names**
- **Event names**
- **Command names**

### Example: Order Context
- **Draft**: Order being created
- **Pending**: Waiting for payment
- **Confirmed**: Payment accepted
- **Preparing**: Kitchen working
- **Ready**: Food prepared
- **Delivered**: Completed delivery
- **Cancelled**: Aborted

## Service Planning Checklist

For each new service:
- [ ] Define bounded context responsibility
- [ ] Identify core aggregates
- [ ] Design value objects
- [ ] Define domain events
- [ ] Map upstream/downstream contexts
- [ ] Define ubiquitous language
- [ ] Plan API endpoints
- [ ] Plan event subscriptions
- [ ] Plan database schema
