# Architecture & Flow Diagrams

Mermaid diagrams for the Food Ordering system.

---

## 1. System Architecture

Shows all services, infrastructure, and communication paths.

```mermaid
graph TB
    subgraph Clients
        Client[HTTP Client]
    end

    subgraph Services
        OS[Order Service<br/>:3001]
        PS[Payment Service<br/>:3003]
        KS[Kitchen Service<br/>:3002]
        NS[Notification Service<br/>:3004]
        AS[Analytics Service<br/>:3005]
    end

    subgraph Infrastructure
        RMQ[RabbitMQ<br/>:5672]
        Redis[Redis<br/>:6379]
        PG1[Postgres Orders<br/>:5432]
        PG2[Postgres Payments<br/>:5433]
    end

    Client -->|POST /orders| OS
    Client -->|GET /orders/:id| OS

    OS -->|publish events| RMQ
    PS -->|consume order.created| RMQ
    PS -->|publish payment.confirmed/rejected| RMQ
    KS -->|consume order.created| RMQ
    KS -->|publish order.ready| RMQ
    NS -->|consume order.# payment.#| RMQ
    AS -->|consume order.# payment.#| RMQ

    KS -->|enqueue jobs| Redis
    Redis -->|worker processes| KS

    OS -.->|persist orders| PG1
    PS -.->|persist payments| PG2

    style RMQ fill:#f96,stroke:#333,color:#000
    style Redis fill:#d44,stroke:#333,color:#fff
    style PG1 fill:#336791,stroke:#333,color:#fff
    style PG2 fill:#336791,stroke:#333,color:#fff
```

---

## 2. Order Creation Flow

The main flow when a customer places an order.

```mermaid
sequenceDiagram
    participant C as Client
    participant OS as Order Service
    participant RMQ as RabbitMQ
    participant PS as Payment Service
    participant KS as Kitchen Service
    participant Redis as Redis (BullMQ)
    participant NS as Notification Service
    participant AS as Analytics Service

    C->>OS: POST /orders<br/>{customerId, restaurantId, items}
    OS->>OS: Order.create()<br/>Emits OrderCreated event
    OS->>OS: Persist order (InMemoryRepo)
    OS->>RMQ: Publish order.created
    RMQ-->>OS: 201 {orderId, status: PENDING, totalAmount}

    par Payment Processing
        RMQ->>PS: Consume order.created
        PS->>PS: Payment aggregate<br/>confirm()
        PS->>RMQ: Publish payment.confirmed
    and Kitchen Queueing
        RMQ->>KS: Consume order.created
        KS->>Redis: Enqueue BullMQ job
    and Notifications
        RMQ->>NS: Consume order.created
        NS->>NS: Log "New order"
    end

    RMQ->>NS: Consume payment.confirmed
    NS->>NS: Log "Payment confirmed"

    RMQ->>AS: Consume order.created
    AS->>AS: Increment totalOrders, totalRevenue

    RMQ->>AS: Consume payment.confirmed
    AS->>AS: Increment ordersByStatus.PAID

    Note over Redis,Kitchen Service: Async processing starts
```

---

## 3. Kitchen Processing Flow (BullMQ)

How kitchen-service processes orders through the BullMQ worker pipeline.

```mermaid
flowchart TD
    A[RabbitMQ: order.created event] --> B[KitchenConsumer<br/>RabbitMQ subscriber]
    B --> C{Parse event data}
    C --> D[KitchenQueue.addJob<br/>Enqueue to BullMQ]
    D --> E[BullMQ Queue<br/>kitchen-jobs in Redis]

    E --> F[KitchenWorkerService<br/>BullMQ Worker]
    F --> G[ProcessKitchenTicketUseCase<br/>delegate to use case]
    
    G --> H[Create KitchenTicket<br/>createFromOrder]

    H --> I[startPreparing<br/>WAITING → PREPARING]
    I --> J[Simulate prep time<br/>1-30s random]
    J --> K[markReady<br/>PREPARING → READY]

    K --> L[Publish order.ready<br/>via EventPublisher]
    L --> M[Done]

    style E fill:#d44,stroke:#333,color:#fff
    style F fill:#4a9,stroke:#333,color:#fff
    style G fill:#48d,stroke:#333,color:#fff
```

---

## 4. DDD Layered Architecture (per Bounded Context)

Shows the dependency direction within each service.

```mermaid
graph TD
    subgraph "Order Bounded Context"
        direction TB
        HTTP["HTTP Layer<br/>OrderController"]
        APP["Application Layer<br/>CreateOrderUseCase<br/>GetOrderUseCase"]
        DOM["Domain Layer<br/>Order Aggregate<br/>OrderStatus VO<br/>OrderItem VO"]
        INFRA["Infrastructure Layer<br/>InMemoryRepository<br/>RabbitMQEventPublisher"]
        REPO_IF["Repository Interface<br/>(defined in domain)"]
        PUB_IF["EventPublisher Interface<br/>(defined in application)"]
    end

    HTTP --> APP
    APP --> DOM
    APP --> PUB_IF
    DOM --> REPO_IF
    INFRA -.->|implements| REPO_IF
    INFRA -.->|implements| PUB_IF

    style DOM fill:#48d,stroke:#333,color:#fff
    style APP fill:#4a9,stroke:#333,color:#fff
    style INFRA fill:#999,stroke:#333,color:#fff
    style HTTP fill:#c63,stroke:#333,color:#fff
```

**Dependency rule:** Arrows point inward. Domain never imports from any other layer.

---

## 5. Domain Events & Routing

Shows all events and which services produce/consume them via RabbitMQ topic exchange.

```mermaid
graph LR
    subgraph Producers
        OS[Order Service]
        PS[Payment Service]
        KS[Kitchen Service]
    end

    subgraph "RabbitMQ Exchange<br/>food-ordering (topic)"
        direction TB
        E1[order.created]
        E2[payment.confirmed]
        E3[payment.rejected]
        E4[order.ready]
        E5[order.confirmed]
    end

    subgraph Consumers
        PS_C[Payment Service]
        KS_C[Kitchen Service]
        NS[Notification Service]
        AS[Analytics Service]
    end

    OS -->|publish| E1
    OS -->|publish| E5
    PS -->|publish| E2
    PS -->|publish| E3
    KS -->|publish| E4

    E1 -->|routing: order.created| PS_C
    E1 -->|routing: order.created| KS_C
    E1 -->|routing: order.#| NS
    E1 -->|routing: order.#| AS

    E2 -->|routing: payment.#| NS
    E2 -->|routing: payment.#| AS
    E3 -->|routing: payment.#| NS
    E3 -->|routing: payment.#| AS

    E4 -->|routing: order.#| NS
    E4 -->|routing: order.#| AS
```

---

## 6. Order Aggregate State Machine

Valid state transitions for the Order aggregate.

```mermaid
stateDiagram-v2
    [*] --> PENDING : Order.create()
    PENDING --> CONFIRMED : confirm()
    PENDING --> CANCELLED : cancel()
    CONFIRMED --> PREPARING : startPreparing()
    CONFIRMED --> CANCELLED : cancel()
    PREPARING --> READY : markReady()
    READY --> DELIVERED : (future)
    CANCELLED --> [*]
    DELIVERED --> [*]

    note right of PENDING
        Emits: order.created
    end note

    note right of CONFIRMED
        Emits: order.confirmed
    end note
```

---

## 7. Monorepo Structure

How the packages are organized and depend on each other.

```mermaid
graph BT
    subgraph "Shared Packages"
        SHARED["@app/shared<br/>DDD base classes<br/>Event contracts<br/>Money VO"]
        MSG["@app/messaging<br/>RabbitMQ connection<br/>Publish/Subscribe"]
    end

    subgraph "Bounded Contexts"
        ORDER["@app/order-service"]
        PAYMENT["@app/payment-service"]
        KITCHEN["@app/kitchen-service"]
        NOTIF["@app/notification-service"]
        ANALYTICS["@app/analytics-service"]
    end

    ORDER --> SHARED
    ORDER --> MSG
    PAYMENT --> SHARED
    PAYMENT --> MSG
    KITCHEN --> SHARED
    KITCHEN --> MSG
    NOTIF --> SHARED
    NOTIF --> MSG
    ANALYTICS --> SHARED
    ANALYTICS --> MSG

    style SHARED fill:#48d,stroke:#333,color:#fff
    style MSG fill:#f96,stroke:#333,color:#000
```

**Rule:** Services never import from other services. Communication only via RabbitMQ events.
