# Food Delivery Microservices

**[English version](./README.en.md)**

Sistema distribuído para processamento de pedidos de delivery, implementado com arquitetura de microsserviços, Domain-Driven Design (DDD) e Event-Driven Architecture (EDA).

## Visão Geral

Este projeto implementa um sistema completo de food delivery, focado em demonstrar práticas de arquitetura de microsserviços, orquestração de eventos e design orientado ao domínio. A comunicação entre serviços é assíncrona, baseada em eventos de domínio publicados em um message broker.

### Arquitetura do Sistema

```mermaid
graph TB
    Client[Cliente Mobile/Web]

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

## Decisões de Arquitetura

### Comunicação Assíncrona

A escolha por Event-Driven Architecture permite:

- **Desacoplamento temporal**: Serviços não precisam estar disponíveis simultaneamente
- **Escalabilidade independente**: Cada serviço pode escalar conforme demanda
- **Tolerância a falhas**: Mensagens persistem até processamento

### Database per Service

Cada microsserviço mantém seu próprio banco de dados:

| Serviço | Database | Porta |
|---------|----------|-------|
| Order | orders | 5432 |
| Payment | payments | 5433 |
| Kitchen | kitchen | 5434 |
| Customer | customers | 5436 |
| Restaurant | restaurants | 5437 |
| Auth | auth | 5438 |

Essa separação garante independência de deploy e evolução do schema.

### Orquestração vs Coreografia

O sistema utiliza um modelo híbrido:

- **Coreografia**: Eventos de domínio propagam estado através do RabbitMQ
- **Orquestração**: Order Service atua como orquestrador do fluxo de pedido

## Fluxo de Pedidos

```mermaid
sequenceDiagram
    actor C as Cliente
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
    alt Pagamento Aprovado
        PS->>RMQ: payment.confirmed
    else Pagamento Recusado
        PS->>RMQ: payment.rejected
    end

    RMQ->>KS: payment.confirmed
    KS->>KS: CreateKitchenTicket()
    KS->>KS: Enqueue BullMQ Job
    Note over KS: 1-30s: Preparo assíncrono
    KS->>RMQ: order.ready

    RMQ->>OS: order.ready
    OS->>OS: order.markReady()

    RMQ->>NS: payment.confirmed
    RMQ->>NS: order.ready
    NS->>NS: SendNotifications()
```

## Máquina de Estados do Pedido

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
        Aguardando pagamento
    end note

    note right of PREPARING
        Em preparação na cozinha
    end note

    note right of READY
        Pronto para entrega
    end note
```

## Stack Tecnológico

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|
| Runtime | Bun 1.0+ | Performance superior ao Node.js, nativo para TypeScript |
| Framework | NestJS | Arquitetura modular, injeção de dependências, DTOs |
| Message Broker | RabbitMQ | Confirmação de entrega, routing flexível, DLQ |
| Job Queue | BullMQ + Redis | Processamento assíncrono com retentativa |
| ORM | TypeORM | Abstração de database, suporte a PostgreSQL |
| Database | PostgreSQL 16 | ACID, consistência forte por serviço |
| Documentação | OpenAPI 3.0 | Contrato de API, auto-documentação |

## Domain-Driven Design

Cada serviço segue a estrutura de camadas do DDD:

```
src/
├── domain/                    # Camada de Domínio (Core)
│   ├── aggregates/           # AggregateRoots (consistencia)
│   ├── value-objects/        # VOs imutáveis (tipos)
│   ├── events/               # Domain Events
│   └── repositories/         # Interfaces de repos
│
├── application/               # Camada de Aplicação
│   ├── use-cases/           # Casos de uso (orchestration)
│   └── dto/                 # Data Transfer Objects
│
└── infra/                     # Camada de Infraestrutura
    ├── database/
    │   ├── typeorm/        # Implementações TypeORM
    │   └── memory/         # Repositórios em memória (testes)
    ├── http/               # Controllers, validação
    └── messaging/          # Consumers, publishers
```

### Aggregate Roots

Aggregates garantem consistência transacional:

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

Eventos capturam mudanças de estado de negócio:

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

## Eventos Publicados

| Evento | Publicado Por | Consumido Por | Payload |
|--------|--------------|---------------|---------|
| `order.created` | Order Service | Payment, Kitchen, Analytics | orderId, items, totalAmountCents |
| `payment.confirmed` | Payment Service | Order, Kitchen, Notification | orderId, paymentId |
| `payment.rejected` | Payment Service | Order, Notification | orderId, reason |
| `order.ready` | Kitchen Service | Order, Notification | orderId, kitchenTicketId |
| `order.completed` | Order Service | Analytics, Notification | orderId, deliveredAt |
| `user.registered` | Auth Service | Analytics, Notification | userId, email |
| `restaurant.created` | Restaurant Service | Analytics | restaurantId |

## Setup do Ambiente

### Pré-requisitos

```bash
# Bun runtime
curl -fsSL https://bun.sh/install | bash

# Docker (infraestrutura)
# https://docs.docker.com/get-docker/
```

### Instalação

```bash
# Clone o repositório
git clone <repository-url>
cd food-delivery-microservices

# Instalação de dependências
bun install

# Iniciar infraestrutura
bun run dev:infra
```

### Docker Compose

A infraestrutura Docker está organizada em camadas isoladas. Veja [DOCKER.md](./DOCKER.md) para detalhes completos.

```bash
# Desenvolvimento - Stack completa
bun run docker:dev

# Produção - Simulação
bun run docker:prod

# Apenas infraestrutura (RabbitMQ, Redis, DBs)
bun run dev:infra
```

### Variáveis de Ambiente

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

## Execução

### Desenvolvimento Local

```bash
# Serviços rodando no host (com infra Docker)
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

# Ou todos de uma vez
bun run dev
```

### Docker

```bash
# Stack completa (serviços em containers)
bun run docker:dev

# Produção simulada
bun run docker:prod

# Parar containers
bun run docker:dev:down
bun run docker:prod:down
```

### Testes

```bash
# Unitários
bun test

# Por serviço
bun run test:shared      # Domain primitives
bun run test:order       # Order domain
bun run test:kitchen     # Kitchen domain
bun run test:payment     # Payment domain
bun run test:auth        # Auth domain
bun run test:restaurant  # Restaurant domain
```

## API Documentation

| Serviço | Swagger UI | Scalar |
|---------|------------|--------|
| API Gateway | http://localhost:3000/api/docs | http://localhost:3000/api |
| Auth Service | http://localhost:3008/api/docs | http://localhost:3008/api |
| Customer Service | http://localhost:3006/api/docs | http://localhost:3006/api |
| Restaurant Service | http://localhost:3007/api/docs | http://localhost:3007/api |
| Order Service | http://localhost:3001/api/docs | http://localhost:3001/api |
| Kitchen Service | http://localhost:3002/api/docs | http://localhost:3002/api |
| Payment Service | http://localhost:3003/api/docs | http://localhost:3003/api |

## Padrões Implementados

- **Aggregate Pattern**: Consistência transacional por agregado
- **Event Sourcing (Parcial)**: Domain Events para notificações
- **CQRS**: Separação leitura/escrita em controllers
- **Outbox Pattern**: Publicação de eventos após commit
- **Retry Pattern**: BullMQ com backoff exponencial
- **JWT Authentication**: Access tokens (15min) + Refresh tokens (7 dias)
- **Role-Based Access Control**: CUSTOMER, RESTAURANT, DELIVERY, ADMIN

## Trade-offs e Limitações

### Decisões Técnicas

| Decisão | Benefício | Trade-off |
|---------|-----------|-----------|
| Database per Service | Independência | Queries distribuídas |
| Event-driven | Desacoplamento | Complexidade de debug |
| Bun runtime | Performance | Ecossistema menor |
| In-memory repos (testes) | Velocidade | Diferença de comportamento |

### Limitações Atuais

- Não implementado: Saga pattern para compensação
- Não implementado: Distributed tracing
- Não implementado: Event store para replay
- UI/Simulador de cliente não incluso

## Deploy em Produção

```bash
# Stack completa em Docker
bun run docker:prod

# Verificação de saúde
./scripts/status.sh

# Logs agregados
./scripts/logs.sh

# Shutdown
bun run docker:prod:down
```

## Estrutura do Monorepo

```
food-delivery-microservices/
├── packages/
│   ├── shared/                    # Dominio compartilhado
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

## Licença

MIT

## Autor

Felipe Marques

---

Projeto de estudo demonstrando arquitetura de microsserviços com NestJS, Bun e Event-Driven Architecture.
