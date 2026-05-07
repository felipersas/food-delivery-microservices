# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Food delivery microservices architecture using NestJS with Bun runtime. Event-driven architecture with RabbitMQ, domain-driven design (DDD) patterns, and PostgreSQL persistence.

## Commands

```bash
# Install dependencies (root workspace)
bun install

# Infrastructure (RabbitMQ, Redis, PostgreSQL)
bun run dev:infra          # Start infra + DBs: docker compose -f infra.yml -f db.yml
bun run dev:infra:down     # Stop: docker compose -f infra.yml -f db.yml down

# Docker (services in containers)
bun run docker:dev         # Full stack: docker compose -f infra.yml -f db.yml -f dev.yml
bun run docker:dev:down    # Stop all
bun run docker:prod        # Production simulation
bun run docker:prod:down   # Stop production

# Development — Run individual services (on host)
bun run dev:auth           # Auth Service (port 3008)
bun run dev:customer       # Customer Service (port 3006)
bun run dev:restaurant     # Restaurant Service (port 3007)
bun run dev:order          # Order Service (port 3001)
bun run dev:kitchen        # Kitchen Service (port 3002)
bun run dev:payment        # Payment Service (port 3003)
bun run dev:notification   # Notification Service (port 3004)
bun run dev:analytics      # Analytics Service (port 3005)
bun run dev:gateway        # API Gateway (port 3000)

# Build API Gateway (only service with build step)
cd packages/api-gateway && bun run build

# Testing
bun test                   # All tests (root)
bun run test:e2e           # End-to-end flow tests
bun run test:auth          # Auth service tests
bun run test:customer      # Customer service tests
bun run test:restaurant    # Restaurant service tests
bun run test:order         # Order service tests
bun run test:kitchen       # Kitchen service tests
bun run test:payment       # Payment service tests
bun run test:notification  # Notification service tests
bun run test:analytics     # Analytics service tests
bun run test:shared        # Shared package tests

# Production Deployment
./scripts/deploy.sh        # Build and start all services
./scripts/status.sh        # Check health status
./scripts/logs.sh          # Stream logs (all or specific service)
./scripts/stop.sh          # Stop all services

# Linting & Formatting
bun run lint               # ESLint with --fix
bun run format             # Prettier
```

## Architecture

### Monorepo Structure
- `packages/shared` — Domain primitives (Entity, AggregateRoot, ValueObject, Money, event types)
- `packages/messaging` — RabbitMQ connection wrapper (`RabbitMQConnection`)
- `packages/auth-service` — Authentication & authorization (JWT, RBAC)
- `packages/customer-service` — Customer domain management
- `packages/restaurant-service` — Restaurant & menu management
- `packages/order-service` — Order domain with REST API
- `packages/kitchen-service` — Kitchen domain with BullMQ job queue
- `packages/payment-service` — Payment domain
- `packages/notification-service` — Notification consumer
- `packages/analytics-service` — Analytics consumer
- `packages/api-gateway` — HTTP proxy gateway routing to microservices

### Docker Compose Structure
- `docker-compose.infra.yml` — Infrastructure (RabbitMQ, Redis)
- `docker-compose.db.yml` — Databases (6 PostgreSQL, internal network)
- `docker-compose.dev.yml` — Application services (dev with exposed ports)
- `docker-compose.prod.yml` — Application services (production config)

See [DOCKER.md](./DOCKER.md) for detailed Docker documentation.

### Service Communication Pattern
- **Events via RabbitMQ**: All services publish/subscribe through `food-ordering` exchange
- **REST via API Gateway**: Single entry point (port 3000) proxies to service ports
- **Job Queue**: Kitchen service uses BullMQ with Redis for async processing
- **Validation**: API Gateway validates basic structure, microservices validate business rules

### Order Flow (Event-Driven)

```
1. Client → API Gateway → Auth Service
   Validate JWT token → User authenticated

2. Client → API Gateway → Order Service
   POST /orders → creates Order aggregate

3. Order Service emits: order.created
   └─→ Payment Service listens
   └─→ Analytics Service listens

4. Payment Service processes payment
   └─→ Emits: payment.confirmed ✅ OR payment.rejected ❌

5. Kitchen Service listens to payment.confirmed ONLY
   └─→ Creates BullMQ job (async, 1-30s food preparation)
   └─→ Emits: order.ready

6. Notification Service listens to all events
   └─→ Sends confirmations (email/SMS)

7. Order Service listens to payment.confirmed, order.ready
   └─→ Updates order status
```

**Critical Business Rule**: Kitchen only starts preparing AFTER payment confirmation.

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
- Separate databases per service (isolated on internal Docker network in production):
  - `orders` (port 5432), `payments` (5433), `kitchen` (5434)
  - `customers` (5436), `restaurants` (5437), `auth` (5438)

### API Gateway Routing
Controllers proxy requests to microservice ports with DTO validation:
- `POST /orders` → `http://localhost:3001/orders` (validates CreateOrderDto)
- `POST /payments` → `http://localhost:3003/payments` (validates CreatePaymentDto)
- `GET /kitchen/tickets` → `http://localhost:3002/kitchen/tickets` (validates query params)
- `POST /auth/*` → `http://localhost:3008/auth/*` (login, register, refresh)
- `GET /restaurants/*` → `http://localhost:3007/restaurants/*` (restaurant CRUD)
- `GET /customers/*` → `http://localhost:3006/customers/*` (customer profiles)
- Uses `HttpProxyStrategy` with `httpx` fetch for requests
- ValidationPipe enabled with `whitelist: true`, `transform: true`

**Validation Strategy**: First line of defense at gateway, complete validation at microservices.

### API Documentation (OpenAPI + Scalar)

All services provide interactive API documentation using OpenAPI 3.0 specification with two UI options:

**Swagger UI** - Traditional interactive documentation:
- API Gateway: http://localhost:3000/api/docs
- Auth Service: http://localhost:3008/api/docs
- Customer Service: http://localhost:3006/api/docs
- Restaurant Service: http://localhost:3007/api/docs
- Order Service: http://localhost:3001/api/docs
- Kitchen Service: http://localhost:3002/api/docs
- Payment Service: http://localhost:3003/api/docs

**Scalar UI** - Modern, fast API documentation:
- API Gateway: http://localhost:3000/api
- Auth Service: http://localhost:3008/api
- Customer Service: http://localhost:3006/api
- Restaurant Service: http://localhost:3007/api
- Order Service: http://localhost:3001/api
- Kitchen Service: http://localhost:3002/api
- Payment Service: http://localhost:3003/api

**OpenAPI JSON** - Machine-readable spec:
- API Gateway: http://localhost:3000/api/docs-json
- Auth Service: http://localhost:3008/api/docs-json
- Customer Service: http://localhost:3006/api/docs-json
- Restaurant Service: http://localhost:3007/api/docs-json
- Order Service: http://localhost:3001/api/docs-json
- Kitchen Service: http://localhost:3002/api/docs-json
- Payment Service: http://localhost:3003/api/docs-json

**Documentation Features:**
- Complete request/response schemas with examples
- Enum values and validation constraints visible
- Try endpoints directly from the UI
- Bearer auth configuration for protected routes
- Tagged endpoints by domain (auth, orders, payments, kitchen, restaurants, health)

### Environment Variables
Copy `.env.example` to `.env`. Key variables:
- `RABBITMQ_URL`, `RABBITMQ_EXCHANGE`
- `DB_DRIVER` (postgres/omit for in-memory)
- `{SERVICE}_PORT`, `{SERVICE}_DATABASE_URL`
- `JWT_SECRET`, `JWT_EXPIRES_IN`, `REFRESH_TOKEN_EXPIRES_IN` (Auth Service)

## Development Notes

**CRITICAL: NEVER use .js file extensions in imports**
- All imports must be extension-less (e.g., `from './file'` NOT `from './file.js'`)
- Bun handles TypeScript files directly at runtime
- This is a hard rule - do NOT add .js extensions to fix import errors
- If you get "Cannot find module" errors, investigate the actual cause (file doesn't exist, wrong path, etc.)

### Test-Driven Development

**MANDATORY**: Run tests after EVERY code change to ensure functionality remains intact.

```bash
# Run all tests after making changes
bun test

# For service-specific changes, run targeted tests
bun run test:order         # After order service changes
bun run test:kitchen       # After kitchen service changes
bun run test:payment       # After payment service changes
```

**Why test after every change?**
- Catches regressions immediately
- Validates integration points between services
- Ensures domain logic remains correct
- Prevents cascading failures in event-driven architecture

**Test failure is a blocker**: Do not proceed with further changes until tests pass. If tests fail, fix the issue before adding new features.

### Documentation Lookup - Context7 MCP

**IMPORTANT**: When you need documentation for ANY framework, library, SDK, API, CLI tool, or cloud service (including NestJS), ALWAYS use the **Context7 MCP server** first:

1. **For first-time library lookup** (when you don't know the exact Context7 ID):
```
Use: mcp__context7__resolve-library-id
Parameters:
- libraryName: e.g., "NestJS", "Prisma", "React", "Next.js"
- query: specific task context
```

2. **For querying documentation** (after you have the library ID):
```
Use: mcp__context7__query-docs
Parameters:
- libraryId: e.g., "/nestjs/docs.nestjs.com"
- query: specific question or task
```

**Why use Context7 MCP?**
- Provides up-to-date documentation (your training data may be outdated)
- Returns official docs with code examples
- Faster and more accurate than web search
- Covers version-specific changes

**Common library IDs** (pre-resolved):
- NestJS: `/nestjs/docs.nestjs.com`
- Prisma: `/prisma/prisma`
- Next.js: `/vercel/next.js`

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

## Local Skills - Project Patterns

This project has local skills in `.claude/skills/` that enforce DDD patterns and code conventions.

### Skill Structure (NEW)

Skills follow a **directory-based format**:
```
.claude/skills/
├── skill-name/
│   └── SKILL.md
└── README.md
```

### Available Skills
- **service-scaffolder** - Generate new microservice structure
- **code-patterns** - Enforce project code patterns and conventions
- **domain-planner** - Plan domain models following DDD strategic patterns
- **skill-creation-guide** - Guide for creating new skills following project standards

These skills are automatically loaded. See `.claude/skills/README.md` for details.

### When Adding New Services

Before implementing, reference:
1. **domain-planner** - Design aggregates, value objects, events
2. **service-scaffolder** - Generate correct structure
3. **code-patterns** - Ensure patterns are followed

Example: "Use service-scaffolder patterns to create the restaurant service structure"

### Key Patterns to Follow

**Aggregates:**
- Inherit from `AggregateRoot<string>`
- Private fields only, getters for access
- Factory methods: `static create()` and `static reconstitute()`
- Emit domain events before state changes
- Increment version on state transition

**Value Objects:**
- Inherit from `ValueObject<T>`
- Immutable via `Object.freeze()`
- Factory method: `static create()` with validation
- Private constructor

**Use Cases:**
- Single `execute()` method
- Input DTO → Domain → Output DTO flow
- Transaction boundary: save + publish events

**Events:**
- Format: `aggregate.action` (past tense)
- Payload: minimal data only
- Published after transaction commit

## Implementation Plans

See `docs/planning/` for detailed implementation plans:
- **restaurant-service.md** - Restaurant and menu management
