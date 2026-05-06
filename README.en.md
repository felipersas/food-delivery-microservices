# Food Delivery Microservices

**[Versão em Português](./README.md)**

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
        Auth[Auth Service<br/>Port: 3008]
        Customer[Customer Service<br/>Port: 3006]
        Restaurant[Restaurant Service<br/>Port: 3007]
        Order[Order Service<br/>Port: 3001]
        Kitchen[Kitchen Service<br/>Port: 3002]
        Payment[Payment Service<br/>Port: 3003]
        Notification[Notification Service<br/>Port: 3004]
        Analytics[Analytics Service<br/>Port: 3005]
    end

    subgraph "Infrastructure"
        RabbitMQ[RabbitMQ<br/>Event Bus]
        Redis[(Redis<br/>Job Queue)]
        Postgres1[(PostgreSQL<br/>Orders)]
        Postgres2[(PostgreSQL<br/>Kitchen)]
        Postgres3[(PostgreSQL<br/>Payments)]
        Postgres4[(PostgreSQL<br/>Customers)]
        Postgres5[(PostgreSQL<br/>Restaurants)]
        Postgres6[(PostgreSQL<br/>Auth)]
    end

    Client -->|HTTP/REST| Gateway
    Gateway --> Auth
    Gateway --> Customer
    Gateway --> Restaurant
    Gateway --> Order

    Order -->|Write| Postgres1
    Kitchen -->|Write| Postgres2
    Payment -->|Write| Postgres3
    Customer -->|Write| Postgres4
    Restaurant -->|Write| Postgres5
    Auth -->|Write| Postgres6

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
| Restaurant | restaurants | 5437 |
| Auth | auth | 5438 |

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
    participant AU as Auth Service
    participant OS as Order Service
    participant PS as Payment Service
    participant KS as Kitchen Service
    participant NS as Notification Service
    participant RMQ as RabbitMQ

    C->>GW: POST /orders
    GW->>AU: Validate Token
    AU->>GW: User Validated
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
| `user.registered` | Auth Service | Analytics, Notification | userId, email |
| `restaurant.created` | Restaurant Service | Analytics | restaurantId |

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

### Docker Compose

Docker infrastructure is organized in isolated layers. See [DOCKER.md](./DOCKER.md) for complete details.

```bash
# Development - Full stack
bun run docker:dev

# Production - Simulation
bun run docker:prod

# Infrastructure only (RabbitMQ, Redis, DBs)
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
RESTAURANT_DATABASE_URL=postgresql://postgres:postgres@localhost:5437/restaurants
AUTH_DATABASE_URL=postgresql://postgres:postgres@localhost:5438/auth

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Auth Service
JWT_SECRET=dev-secret-change-in-production
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
```

## Running

### Local Development

```bash
# Services running on host (with Docker infra)
bun run dev:infra
bun run dev:auth
bun run dev:customer
bun run dev:restaurant
bun run dev:order
bun run dev:kitchen
bun run dev:payment
bun run dev:notification
bun run dev:analytics
sleep 3 && bun run dev:gateway

# Or all at once
bun run dev
```

### Docker

```bash
# Full stack (services in containers)
bun run docker:dev

# Production simulation
bun run docker:prod

# Stop containers
bun run docker:dev:down
bun run docker:prod:down
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
bun run test:auth        # Auth domain
bun run test:restaurant  # Restaurant domain
```

## API Documentation

| Service | Swagger UI | Scalar |
|---------|------------|--------|
| API Gateway | http://localhost:3000/api/docs | http://localhost:3000/api |
| Auth Service | http://localhost:3008/api/docs | http://localhost:3008/api |
| Customer Service | http://localhost:3006/api/docs | http://localhost:3006/api |
| Restaurant Service | http://localhost:3007/api/docs | http://localhost:3007/api |
| Order Service | http://localhost:3001/api/docs | http://localhost:3001/api |
| Kitchen Service | http://localhost:3002/api/docs | http://localhost:3002/api |
| Payment Service | http://localhost:3003/api/docs | http://localhost:3003/api |

## Implemented Patterns

- **Aggregate Pattern**: Transactional consistency per aggregate
- **Event Sourcing (Partial)**: Domain Events for notifications
- **CQRS**: Read/write separation in controllers
- **Outbox Pattern**: Event publishing after commit
- **Retry Pattern**: BullMQ with exponential backoff
- **JWT Authentication**: Access tokens (15min) + Refresh tokens (7 days)
- **Role-Based Access Control**: CUSTOMER, RESTAURANT, DELIVERY, ADMIN

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
# Full stack in Docker
bun run docker:prod

# Health check
./scripts/status.sh

# Aggregated logs
./scripts/logs.sh

# Shutdown
bun run docker:prod:down
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
│   ├── auth-service/             # Auth bounded context
│   ├── customer-service/         # Customer bounded context
│   ├── restaurant-service/       # Restaurant bounded context
│   ├── order-service/            # Order bounded context
│   ├── kitchen-service/          # Kitchen bounded context
│   ├── payment-service/          # Payment bounded context
│   ├── notification-service/     # Notification consumers
│   └── analytics-service/        # Analytics consumers
│
├── docker-compose.infra.yml       # RabbitMQ, Redis
├── docker-compose.db.yml          # PostgreSQL databases
├── docker-compose.dev.yml         # Application services (dev)
├── docker-compose.prod.yml        # Application services (prod)
├── DOCKER.md                      # Docker documentation
├── CLAUDE.md                      # Claude Code instructions
├── package.json                   # Root workspace
└── scripts/
```

## License

MIT

## Author

Felipe Marques

---

Study project demonstrating microservices architecture with NestJS, Bun, and Event-Driven Architecture.
