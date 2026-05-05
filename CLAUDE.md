# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Food delivery microservices architecture using NestJS with Bun runtime. Event-driven architecture with RabbitMQ, domain-driven design (DDD) patterns, and PostgreSQL persistence.

## Commands

```bash
# Install dependencies (root workspace)
bun install

# Infrastructure (RabbitMQ, Redis, PostgreSQL)
bun run dev:infra          # Start: docker compose up
bun run dev:infra:down     # Stop: docker compose down

# Development — Run individual services
bun run dev:order          # Order Service (port 3001)
bun run dev:kitchen        # Kitchen Service (port 3002)
bun run dev:payment        # Payment Service (port 3003)
bun run dev:notification   # Notification Service (port 3004)
bun run dev:analytics      # Analytics Service (port 3005)

# Build API Gateway (only service with build step)
cd packages/api-gateway && bun run build

# Testing
bun test                   # All tests (root)
bun run test:order         # Order service tests
bun run test:kitchen       # Kitchen service tests
bun run test:payment       # Payment service tests
bun run test:notification  # Notification service tests
bun run test:analytics     # Analytics service tests
bun run test:shared        # Shared package tests

# Linting & Formatting
bun run lint               # ESLint with --fix
bun run format             # Prettier
```

## Architecture

### Monorepo Structure
- `packages/shared` — Domain primitives (Entity, AggregateRoot, ValueObject, Money, event types)
- `packages/messaging` — RabbitMQ connection wrapper (`RabbitMQConnection`)
- `packages/order-service` — Order domain with REST API
- `packages/kitchen-service` — Kitchen domain with BullMQ job queue
- `packages/payment-service` — Payment domain
- `packages/notification-service` — Notification consumer
- `packages/analytics-service` — Analytics consumer
- `packages/api-gateway` — HTTP proxy gateway routing to microservices

### Service Communication Pattern
- **Events via RabbitMQ**: All services publish/subscribe through `food-ordering` exchange
- **REST via API Gateway**: Single entry point (port 3000) proxies to service ports
- **Job Queue**: Kitchen service uses BullMQ with Redis for async processing

### Domain-Driven Design Structure
Each service follows clean architecture layers:
- `domain/` — Aggregates, value objects, domain events
- `application/` — Use cases (e.g., `CreateOrderUseCase`)
- `infra/` — Database (TypeORM entities, repositories), HTTP controllers, messaging (consumers/publishers)

### Key Domain Concepts
- **Aggregates** inherit from `AggregateRoot<string>` in `@app/shared`
- Domain events are emitted via `addDomainEvent()` and published through `RabbitMQEventPublisher`
- Order aggregate implements state machine pattern (`OrderStatus` with `canTransitionTo()`)
- Money value object uses `.BRL()` factory (Brazilian Real)

### Database Configuration
- Set `DB_DRIVER=postgres` to enable PostgreSQL, omit for in-memory repositories
- Services use TypeORM with `synchronize: true` in development (auto-migration)
- Separate databases per service: `orders`, `kitchen`, `payments` (ports 5432, 5434, 5433)

### API Gateway Routing
Controllers proxy requests to microservice ports:
- `GET /orders/*` → `http://localhost:3001`
- `GET /kitchen/*` → `http://localhost:3002`
- Uses `HttpProxyStrategy` with `httpx` fetch for requests

### Environment Variables
Copy `.env.example` to `.env`. Key variables:
- `RABBITMQ_URL`, `RABBITMQ_EXCHANGE`
- `DB_DRIVER` (postgres/omit for in-memory)
- `{SERVICE}_PORT`, `{SERVICE}_DATABASE_URL`

## Development Notes

- Use `bun --watch` for hot reload during development
- API Gateway is the only service with a build step (Bun bundler)
- All TypeScript is executed directly by Bun (no transpile step for services)
- TypeORM migrations: use `bunx --bun typeorm <command>` instead of Node
- Graceful shutdown is implemented across all services

## Git Commit Conventions

**Rules:**
- Semantic commits (conventional-commits format)
- Granular commits (one logical change per commit)
- English language only
- NO co-author attribution

**Format:**
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types:** `feat` | `fix` | `refactor` | `chore` | `docs` | `test` | `perf` | `style`

**Examples:**
```
feat(kitchen): add KDS REST API with ticket CRUD endpoints

fix(order): resolve race condition in status transition

refactor(payment): extract payment processor interface

chore(deps): upgrade nestjs to 10.0.0
```
