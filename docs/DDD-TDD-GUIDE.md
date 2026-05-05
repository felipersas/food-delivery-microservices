# DDD + TDD: Practical Guide

This document explains **Domain-Driven Design (DDD)** and **Test-Driven Development (TDD)** concepts applied to this project.

---

## Table of Contents

- [DDD: Domain-Driven Design](#ddd-domain-driven-design)
  - [The Philosophy](#the-philosophy)
  - [Bounded Contexts](#bounded-contexts)
  - [Ubiquitous Language](#ubiquitous-language)
  - [Architecture Layers](#architecture-layers)
  - [DDD Building Blocks](#ddd-building-blocks)
  - [Domain Events](#domain-events)
- [TDD: Test-Driven Development](#tdd-test-driven-development)
  - [The Philosophy](#the-philosophy-1)
  - [The Red-Green-Refactor Cycle](#the-red-green-refactor-cycle)
  - [Test Pyramid](#test-pyramid)
  - [What We Test in This Project](#what-we-test-in-this-project)
- [How It All Connects](#how-it-all-connects)

---

## DDD: Domain-Driven Design

### The Philosophy

DDD is not an architecture. It's a **way of thinking** about software.

The core idea: **software exists to solve business problems**. Code should reflect the domain (the real-world business), not generic abstractions of databases or frameworks.

> "If you can't explain the code to a domain expert, the model is wrong." — Eric Evans

In our case: the domain is **food ordering**. The code speaks of `Order`, `OrderItem`, `KitchenTicket`, `Payment` — not "orders table" or "database record".

### Bounded Contexts

A complex system can't be described by a single model. DDD divides the system into **bounded contexts**, each with its own model, language, and rules.

In our project:

| Bounded Context | Responsibility | Main Model |
|---|---|---|
| **Order** | Manages orders | `Order` aggregate |
| **Kitchen** | Prepares items | `KitchenTicket` aggregate |
| **Payment** | Processes payments | `Payment` aggregate |
| **Notification** | Sends alerts | Event handlers |
| **Analytics** | Accumulates metrics | Event handlers |

**Practical example:** The concept of "order" means different things in each context:
- In **Order**: an order has items, status, total
- In **Kitchen**: an order is a list of items to prepare
- In **Payment**: an order is an amount to charge

Each context has its own model. They don't share entities — they share **events**.

### Ubiquitous Language

Each bounded context has its own **ubiquitous language** — a shared vocabulary between devs and domain experts.

If the dev says "Order" and the chef says "ticket", there's a problem. The language should be the same in conversations, documents, and code.

In our code: `Order.create()`, `order.confirm()`, `order.startPreparing()` — the code *is* the domain language.

### Architecture Layers

Each bounded context follows a layered architecture with dependencies pointing inward:

```
  ┌─────────────────────────┐
  │        HTTP / MQ        │  ← External interface
  │    (Controllers,        │
  │     Consumers)          │
  ├─────────────────────────┤
  │     Application         │  ← Use cases
  │  (Use Cases, DTOs)      │     Orchestrates, no rules
  ├─────────────────────────┤
  │      Domain             │  ← THE HEART
  │  (Aggregates, VOs,      │     Pure business rules
  │   Events, Repositories) │     Zero external dependencies
  ├─────────────────────────┤
  │     Infrastructure      │  ← Technical details
  │  (Database, RabbitMQ,   │     Implements domain interfaces
  │   External APIs)        │
  └─────────────────────────┘
```

**Golden rule:** Domain never imports from other layers. Other layers import from domain.

In code:
- `domain/` only imports from `@app/shared` (also pure domain)
- `application/` imports from `domain/`
- `infra/` imports from `domain/` and `application/`
- `infra/` is never imported by anyone

### DDD Building Blocks

#### Entity

An object with its own **identity**. Two objects can have the same data but be different entities if they have different IDs.

```
Order #123 and Order #456 are different,
even if both have "2 X-Burgers".
```

In code: `class Order extends AggregateRoot<string>` — identity is the `id`.

#### Value Object

An object defined **by its attributes**, not by identity. Two VOs with the same attributes are equal. They are **immutable**.

```
Money.BRL(50) === Money.BRL(50)  → true
OrderStatus.pending() === OrderStatus.pending()  → true
```

Characteristics:
- **Immutable** — never changes, creates new instance
- **No identity** — compared by value
- **Self-validating** — Money can't have negative value

In code: `Money`, `OrderStatus`, `OrderItem` are VOs.

#### Aggregate Root

A **cluster of objects** treated as a unit. The Aggregate Root is the "gatekeeper" — everything inside the aggregate can only be accessed through it.

```
Order (Aggregate Root)
  ├── OrderItem (VO, lives inside Order)
  ├── OrderStatus (VO, lives inside Order)
  └── Domain Events (emitted by Order)
```

Rules:
1. All internal modifications go through Aggregate Root
2. Outside the aggregate, you reference only by ID, not the object
3. One transaction = one aggregate

In code: `Order.create()`, `order.confirm()`, `order.cancel()` — all modifications go through the aggregate.

#### Repository

An **interface** that abstracts persistence. The domain defines *what* it needs (save, find), infra defines *how* (Postgres, MongoDB, in-memory).

```typescript
// Domain defines the interface
interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  save(order: Order): Promise<void>;
}

// Infra implements
class InMemoryOrderRepository implements OrderRepository { ... }
class PostgresOrderRepository implements OrderRepository { ... }
```

The domain never knows if it's saving in memory, database, or file. This allows testing pure domain without infra.

#### Domain Service

When business logic **doesn't belong to any entity or VO** specifically, it becomes a Domain Service.

Example: `PricingService.calculateTotal(order, coupons, taxes)` — logic involves multiple concepts, not just Order.

*(Our project doesn't have domain services yet, but the pattern is ready in the shared kernel.)*

### Domain Events

Domain Events represent **things that happened** in the domain. They're the glue between bounded contexts.

```
Order creates → emits OrderCreated
Payment confirms → emits PaymentConfirmed
Kitchen finishes → emits OrderReady
```

In code:
```typescript
order.addDomainEvent({
  eventId: uuidv4(),
  eventType: 'order.created',
  occurredAt: new Date().toISOString(),
  aggregateId: order.getId(),
  aggregateType: 'Order',
  data: { orderId, customerId, items, totalAmount },
});
```

**Flow:**
1. Aggregate Root accumulates events internally
2. Application Service saves to repository
3. Application Service publishes events (RabbitMQ)
4. Other bounded contexts consume and react

**Why this matters?** Decoupling. Order Service doesn't need to know Kitchen Service exists. It just emits "order created". Whoever wants to listen, listens.

---

## TDD: Test-Driven Development

### The Philosophy

TDD flips the traditional order: **write the test first, then the code**.

> "If you can't write a test for it, you don't understand the requirement." — Kent Beck

Benefits:
- **Usage-driven design** — you write the API you'd like to have, then implement
- **Safe to refactor** — green tests = working code
- **Living documentation** — tests describe expected behavior
- **Fewer bugs** — you think about edge cases before coding

### The Red-Green-Refactor Cycle

```
   ┌──────────┐
   │   RED    │  1. Write a FAILING test
   │          │     (defines desired behavior)
   └────┬─────┘
        ▼
   ┌──────────┐
   │  GREEN   │  2. Write MINIMUM code to pass
   │          │     (no over-engineering)
   └────┬─────┘
        ▼
   ┌──────────┐
   │ REFACTOR │  3. Improve code keeping tests green
   │          │     (remove duplication, improve names)
   └──────────┘
```

#### Real Example from Our Project

**RED** — Write the test:
```typescript
it('should NOT transition from PENDING to PREPARING', () => {
  const order = makeOrder();
  expect(() => order.startPreparing()).toThrow();
});
```
Test fails because `startPreparing()` doesn't exist or doesn't validate transition.

**GREEN** — Implement minimum:
```typescript
startPreparing(): void {
  this.transitionTo(OrderStatus.preparing());
}

private transitionTo(newStatus: OrderStatus): void {
  if (!this.status.canTransitionTo(newStatus)) {
    throw new Error(`Cannot transition from ${this.status.value} to ${newStatus.value}`);
  }
  this.status = newStatus;
}
```
Test passes.

**REFACTOR** — Transition is already generic, reusable. Nothing to refactor.

### Test Pyramid

```
         ╱  E2E  ╲           Few, slow, test everything integrated
        ╱──────────╲
       ╱ Integration ╲       Some, test real repos + queues
      ╱────────────────╲
    ╱     Unit          ╲   Many, fast, test pure domain
   ╱──────────────────────╲
```

In our project:
- **Unit (pyramid base):** Aggregates, VOs, use cases with mocks — runs in ms
- **Integration (middle):** Repository with real database, publisher with real RabbitMQ
- **E2E (top):** HTTP → full service → database → queue → result

### What We Test in This Project

#### Domain (Pure unit tests)

```typescript
// Aggregate: state machine, events, transitions
describe('Order Aggregate', () => {
  it('should create an order with PENDING status', () => { ... });
  it('should emit OrderCreated domain event', () => { ... });
  it('should NOT transition from PENDING to PREPARING', () => { ... });
});
```

**Why:** Domain is most important. Pure business rules, zero external dependencies, instant tests.

#### Application (Unit tests with mocks)

```typescript
// Use case: orchestration with mocked dependencies
describe('CreateOrderUseCase', () => {
  it('should create an order and persist it', async () => { ... });
  it('should publish domain events after saving', async () => { ... });
});
```

**Why:** We test that use case orchestrates correctly (create → save → publish). Repository and publisher are mocks — we test flow, not database.

---

## How It All Connects

Complete order flow, showing how DDD and TDD work together:

```
1. [TDD] Write test: "Order should emit OrderCreated"
2. [DDD] Implement Order.create() with domain event
3. [TDD] Write test: "CreateOrderUseCase should publish events"
4. [DDD] Implement use case with Repository + EventPublisher (ports)
5. [DDD] Implement InMemoryOrderRepository and RabbitMQEventPublisher (adapters)
6. [TDD] Test everything integrated
```

```
Client → POST /orders
  → OrderController (infra)
    → CreateOrderUseCase (application)
      → Order.create() (domain) → emits OrderCreated
      → orderRepository.save() (infra)
      → eventPublisher.publishAll() (infra) → RabbitMQ
        → Kitchen Service consumes → BullMQ queue
        → Payment Service consumes → processes payment
        → Notification Service consumes → sends alert
        → Analytics Service consumes → accumulates metrics
```

### Practices We Use

| Practice | Where | Example |
|---|---|---|
| **Dependency Inversion** | Domain defines interfaces | `OrderRepository` as interface |
| **Ports & Adapters** | Application defines ports | `EventPublisher` as port |
| **Immutability** | Value Objects | `Money.BRL(50)` never changes |
| **State Machine** | Aggregate Root | `OrderStatus` with valid transitions |
| **Event-Driven** | Domain Events | `OrderCreated` decouples services |
| **Test First** | TDD | Test aggregate before use case |
| **Mock at boundaries** | Application tests | Repository and Publisher are mocks |
| **Monorepo, micro deploy** | Structure | Code together, deploy separately |

---

## References

- *Domain-Driven Design* — Eric Evans (2003)
- *Implementing Domain-Driven Design* — Vaughn Vernon (2013)
- *Test-Driven Development: By Example* — Kent Beck (2002)
- *Clean Architecture* — Robert C. Martin (2017)
