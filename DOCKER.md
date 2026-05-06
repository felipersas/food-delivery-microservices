# Docker Compose - Layered Architecture

## Architecture Overview

Docker infrastructure split into isolated layers following security best practices:

```
┌─────────────────────────────────────────────────────────────┐
│  food-delivery-app     (Application Services)               │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │api-gateway│ │auth- svc │ │order-svc │ │ ...      │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  food-delivery-infra    (Messaging/Cache)                   │
│  ┌──────────┐ ┌──────────┐                                 │
│  │RabbitMQ  │ │  Redis   │                                 │
│  └──────────┘ └──────────┘                                 │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  food-delivery-db       (Databases - INTERNAL ONLY)         │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐   │
│  │order │ │auth  │ │kitchen│ │...   │ │      │ │      │   │
│  └──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Files

| File | Purpose | Networks |
|------|---------|----------|
| `docker-compose.infra.yml` | Infrastructure services (RabbitMQ, Redis) | `food-delivery-infra` |
| `docker-compose.db.yml` | Database services (6 PostgreSQL) | `food-delivery-db` (internal) |
| `docker-compose.dev.yml` | Application services with exposed ports | `food-delivery-app`, `food-delivery-infra`, `food-delivery-db` |
| `docker-compose.prod.yml` | Production config (no exposed ports, restart policies) | Same as dev |

## Security Features

- **Network Isolation**: Databases on internal network (no external access)
- **No DB Port Exposure**: Production doesn't expose 5432-5438 ports
- **Health Checks**: All containers have health checks
- **Restart Policies**: Production services use `restart: unless-stopped`
- **Secrets Management**: JWT_SECRET via environment variables in prod

## Usage

### Development (local)
```bash
# Start infrastructure only (RabbitMQ, Redis, DBs)
bun run dev:infra

# Start everything in Docker (services run in containers)
bun run docker:dev

# Stop Docker services
bun run docker:dev:down
```

### Local Development (services run on host)
```bash
# Start infra, then run services individually with Bun
bun run dev:infra
bun run dev:order
bun run dev:auth
# ... etc
```

### Production Simulation
```bash
bun run docker:prod
bun run docker:prod:down
```

## Port Mapping

| Service | Internal | Dev Exposed |
|---------|----------|-------------|
| API Gateway | 3000 | 3000 |
| Order Service | 3001 | 3001 |
| Kitchen Service | 3002 | 3002 |
| Payment Service | 3003 | 3003 |
| Notification Service | 3004 | 3004 |
| Analytics Service | 3005 | 3005 |
| Customer Service | 3006 | 3006 |
| Restaurant Service | 3007 | 3007 |
| Auth Service | 3008 | 3008 |
| RabbitMQ | 5672, 15672 | 5672, 15672 |
| Redis | 6379 | 6379 |
| Postgres Order | 5432 | - |
| Postgres Payment | 5433 | - |
| Postgres Kitchen | 5434 | - |
| Postgres Customer | 5436 | - |
| Postgres Restaurant | 5437 | - |
| Postgres Auth | 5438 | - |

## Database Connection Strings

Services connect to databases via Docker network names:

```bash
# Inside container (production)
postgres://postgres:postgres@postgres-order:5432/orders
postgres://postgres:postgres@postgres-auth:5438/auth

# Local development (host machine)
postgres://postgres:postgres@localhost:5432/orders
postgres://postgres:postgres@localhost:5438/auth
```
