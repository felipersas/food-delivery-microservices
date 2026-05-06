# Food Delivery Microservices

Distributed food delivery processing system implemented with microservices architecture, Domain-Driven Design (DDD), and Event-Driven Architecture (EDA).

## Overview

This project implements a complete food delivery system, focused on demonstrating microservices architecture practices, event orchestration, and domain-oriented design. Communication between services is asynchronous, based on domain events published through a message broker.

### System Architecture

```mermaid
graph TB
    Client[Client Mobile/Web]

    subgraph "API Layer"
        Gateway[API Gateway<br/>Port: 3000]
    end

    subgraph "Services Layer"
        Customer[Customer Service<br/>Port: 3001]
        Order[Order Service<br/>Port: 3002]
        Kitchen[Kitchen Service<br/>Port: 3003]
        Payment[Payment Service<br/>Port: 3004]
        Notification[Notification Service<br/>Port: 3005]
        Analytics[Analytics Service<br/>Port: 3006]
    end

    subgraph "Infrastructure"
        RabbitMQ[RabbitMQ<br/>Event Bus]
        Redis[(Redis<br/>Job Queue)]
        Postgres1[(PostgreSQL<br/>Orders)]
        Postgres2[(PostgreSQL<br/>Kitchen)]
        Postgres3[(PostgreSQL<br/>Payments)]
        Postgres4[(PostgreSQL<br/>Customers)]
    end

    Client -->|HTTP/REST| Gateway
    Gateway --> Customer
    Gateway --> Order

    Order -->|Write| Postgres1
    Kitchen -->|Write| Postgres2
    Payment -->|Write| Postgres3
    Customer -->|Write| Postgres4

    Order -->|Publish/Subscribe| RabbitMQ
    Payment -->|Publish/Subscribe| RabbitMQ
    Kitchen -->|Publish/Subscribe| RabbitMQ

    Payment -.->|Consume| RabbitMQ
    Kitchen -.->|Consume| RabbitMQ
    Notification -.->|Consume| RabbitMQ
    Analytics -.->|Consume| RabbitMQ
    Order -.->|Consume| RabbitMQ

    Kitchen -->|BullMQ Jobs| Redis

    style Gateway fill:#0288d1,color:#fff,stroke:#01579b,strokeWidth:2px
    style RabbitMQ fill:#f57c00,color:#fff,stroke:#e65100,strokeWidth:2px
    style Redis fill:#c2185b,color:#fff,stroke:#880e4f,strokeWidth:2px
```

## Architecture Decisions

### Asynchronous Communication

The choice for Event-Driven Architecture enables:

- **Temporal decoupling**: Services don't need to be available simultaneously
- **Independent scalability**: Each service scales according to demand
- **Fault tolerance**: Messages persist until processed

### Database per Service

Each microservice maintains its own database:

| Service | Database | Port |
|---------|----------|------|
| Order | orders | 5432 |
| Payment | payments | 5433 |
| Kitchen | kitchen | 5434 |
| Customer | customers | 5436 |

This separation ensures deployment independence and schema evolution.

### Orchestration vs Choreography

The system uses a hybrid model:

- **Choreography**: Domain events propagate state through RabbitMQ
- **Orchestration**: Order Service acts as the order flow orchestrator

## Order Flow

```mermaid
sequenceDiagram
    actor C as Customer
    participant GW as API Gateway
    participant OS as Order Service
    participant PS as Payment Service
    participant KS as Kitchen Service
    participant NS as Notification Service
    participant RMQ as RabbitMQ

    C->>GW: POST /orders
    GW->>OS: CreateOrderRequest
    OS->>OS: Order.create()
    OS->>RMQ: order.created

    RMQ->>PS: order.created
    PS->>PS: ProcessPayment()
    alt Payment Approved
        PS->>RMQ: payment.confirmed
    else Payment Rejected
        PS->>RMQ: payment.rejected
    end

    RMQ->>KS: payment.confirmed
    KS->>KS: CreateKitchenTicket()
    KS->>KS: Enqueue BullMQ Job
    Note over KS: 1-30s: Async preparation
    KS->>RMQ: order.ready

    RMQ->>OS: order.ready
    OS->>OS: order.markReady()

    RMQ->>NS: payment.confirmed
    RMQ->>NS: order.ready
    NS->>NS: SendNotifications()
```

## Order State Machine

```mermaid
stateDiagram-v2
    [*] --> PENDING: order.created
    PENDING --> CONFIRMED: payment.confirmed
    PENDING --> CANCELLED: payment.rejected

    CONFIRMED --> PREPARING: startPreparing()
    PREPARING --> READY: order.ready (from Kitchen)

    READY --> DELIVERED: complete()
    READY --> CANCELLED: cancel()

    CANCELLED --> [*]
    DELIVERED --> [*]

    note right of PENDING
        Awaiting payment
    end note

    note right of PREPARING
        Being prepared at kitchen
    end note

    note right of READY
        Ready for delivery
    end note
```

## Tech Stack

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Runtime | Bun 1.0+ | Superior performance to Node.js, native TypeScript |
| Framework | NestJS | Modular architecture, DI, DTOs |
| Message Broker | RabbitMQ | Delivery confirmation, flexible routing, DLQ |
| Job Queue | BullMQ + Redis | Async processing with retry |
| ORM | TypeORM | Database abstraction, PostgreSQL support |
| Database | PostgreSQL 16 | ACID, strong consistency per service |
| Documentation | OpenAPI 3.0 | API contract, auto-documentation |

## Domain-Driven Design

Each service follows DDD layer structure:

```
src/
├── domain/                    # Domain Layer (Core)
│   ├── aggregates/           # AggregateRoots (consistency)
│   ├── value-objects/        # Immutable VOs (types)
│   ├── events/               # Domain Events
│   └── repositories/         # Repository interfaces
│
├── application/               # Application Layer
│   ├── use-cases/           # Use cases (orchestration)
│   └── dto/                 # Data Transfer Objects
│
└── infra/                     # Infrastructure Layer
    ├── database/
    │   ├── typeorm/        # TypeORM implementations
    │   └── memory/         # In-memory repos (tests)
    ├── http/               # Controllers, validation
    └── messaging/          # Consumers, publishers
```

### Aggregate Roots

Aggregates guarantee transactional consistency:

```typescript
// Order Aggregate
class Order extends AggregateRoot<string> {
  private status: OrderStatus;
  private items: OrderItem[];
  private totalAmount: Money;

  create(): Order { /* ... */ }
  confirm(): void { /* ... */ }
  markReady(): void { /* ... */ }
}
```

### Domain Events

Events capture business state changes:

```typescript
interface DomainEvent {
  eventId: string;
  eventType: string;
  occurredAt: string;
  aggregateId: string;
  aggregateType: string;
  data: unknown;
}
```

## Published Events

| Event | Published By | Consumed By | Payload |
|-------|--------------|-------------|---------|
| `order.created` | Order Service | Payment, Kitchen, Analytics | orderId, items, totalAmountCents |
| `payment.confirmed` | Payment Service | Order, Kitchen, Notification | orderId, paymentId |
| `payment.rejected` | Payment Service | Order, Notification | orderId, reason |
| `order.ready` | Kitchen Service | Order, Notification | orderId, kitchenTicketId |
| `order.completed` | Order Service | Analytics, Notification | orderId, deliveredAt |

## Environment Setup

### Prerequisites

```bash
# Bun runtime
curl -fsSL https://bun.sh/install | bash

# Docker (infrastructure)
# https://docs.docker.com/get-docker/
```

### Installation

```bash
# Clone repository
git clone <repository-url>
cd food-delivery-microservices

# Install dependencies
bun install

# Start infrastructure
bun run dev:infra
```

### Environment Variables

```bash
# .env
RABBITMQ_URL=amqp://guest:guest@localhost:5672
RABBITMQ_EXCHANGE=food-ordering

# Databases
ORDER_DATABASE_URL=postgresql://postgres:postgres@localhost:5432/orders
PAYMENT_DATABASE_URL=postgresql://postgres:postgres@localhost:5433/payments
KITCHEN_DATABASE_URL=postgresql://postgres:postgres@localhost:5434/kitchen
CUSTOMER_DATABASE_URL=postgresql://postgres:postgres@localhost:5436/customers

# Redis
REDIS_URL=redis://localhost:6379
```

## Running

### Development

```bash
# All services
bun run dev

# Individual service
bun run dev:order
bun run dev:kitchen
bun run dev:payment
bun run dev:notification
bun run dev:analytics
bun run dev:gateway

# Hot reload
bun --watch run dev:order
```

### Testing

```bash
# Unit tests
bun test

# Per service
bun run test:shared      # Domain primitives
bun run test:order       # Order domain
bun run test:kitchen     # Kitchen domain
bun run test:payment     # Payment domain
```

## API Documentation

| Service | Swagger UI | Scalar |
|---------|------------|--------|
| API Gateway | http://localhost:3000/api/docs | http://localhost:3000/api |
| Order Service | http://localhost:3002/api/docs | http://localhost:3002/api |
| Kitchen Service | http://localhost:3003/api/docs | http://localhost:3003/api |
| Payment Service | http://localhost:3004/api/docs | http://localhost:3004/api |

## Implemented Patterns

- **Aggregate Pattern**: Transactional consistency per aggregate
- **Event Sourcing (Partial)**: Domain Events for notifications
- **CQRS**: Read/write separation in controllers
- **Outbox Pattern**: Event publishing after commit
- **Retry Pattern**: BullMQ with exponential backoff
- **Circuit Breaker**: (Future) resilience in external integrations

## Trade-offs and Limitations

### Technical Decisions

| Decision | Benefit | Trade-off |
|----------|---------|-----------|
| Database per Service | Independence | Distributed queries |
| Event-driven | Decoupling | Debug complexity |
| Bun runtime | Performance | Smaller ecosystem |
| In-memory repos (tests) | Speed | Behavior difference |

### Current Limitations

- Not implemented: Saga pattern for compensation
- Not implemented: Distributed tracing
- Not implemented: Event store for replay
- Client UI/simulator not included

## Production Deployment

```bash
# Build application
./scripts/deploy.sh

# Health check
./scripts/status.sh

# Aggregated logs
./scripts/logs.sh

# Shutdown
./scripts/stop.sh
```

## Monorepo Structure

```
food-delivery-microservices/
├── packages/
│   ├── shared/                    # Shared domain
│   │   └── src/domain/
│   │       ├── entity.ts
│   │       ├── value-object.ts
│   │       ├── aggregate-root.ts
│   │       └── repository.interface.ts
│   │
│   ├── messaging/                 # RabbitMQ wrapper
│   │   └── src/rabbitmq-connection.ts
│   │
│   ├── api-gateway/              # API Gateway
│   ├── order-service/            # Order bounded context
│   ├── kitchen-service/          # Kitchen bounded context
│   ├── payment-service/          # Payment bounded context
│   ├── customer-service/         # Customer bounded context
│   ├── notification-service/     # Notification consumers
│   └── analytics-service/        # Analytics consumers
│
├── docker-compose.yml
├── package.json                  # Root workspace
└── scripts/
```

## License

MIT

## Author

Felipe Marques

---

Study project demonstrating microservices architecture with NestJS, Bun, and Event-Driven Architecture.
