# Testcontainers Implementation Plan

## Executive Summary

Implement Testcontainers for end-to-end testing across all microservices. This enables running real PostgreSQL and RabbitMQ containers during tests, eliminating mocks and providing confidence in integration points.

## Architecture Overview

### Current State
- Unit tests use in-memory repositories and mocks
- No integration/E2E test coverage
- Manual infrastructure required for integration testing

### Target State
- Testcontainers-managed PostgreSQL + RabbitMQ for tests
- Test suite runs without external infrastructure
- Fast tests via container reuse
- Clear separation: unit tests (fast) vs integration tests (real deps)

---

## Phase 1: Foundation - Shared Testing Infrastructure

### 1.1 Create `@app/test-utils` Package

```
packages/test-utils/
├── package.json
├── src/
│   ├── index.ts
│   ├── containers/
│   │   ├── postgres-container.ts
│   │   ├── rabbitmq-container.ts
│   │   └── redis-container.ts
│   ├── fixtures/
│   │   ├── test-module-builder.ts
│   │   └── test-environment.ts
│   └── helpers/
│       ├── await-event.ts
│       └── clear-database.ts
└── tsconfig.json
```

### 1.2 Install Dependencies

**Root workspace:**
```bash
bun add -D testcontainers \
  @testcontainers/postgresql \
  @testcontainers/rabbitmq \
  @testcontainers/redis
```

**`packages/test-utils/package.json`:**
```json
{
  "name": "@app/test-utils",
  "version": "0.0.1",
  "private": true,
  "type": "module",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "test": "bun test"
  },
  "dependencies": {
    "@app/shared": "workspace:*",
    "@testcontainers/postgresql": "^10.0.0",
    "@testcontainers/rabbitmq": "^10.0.0",
    "@testcontainers/redis": "^10.0.0",
    "testcontainers": "^10.0.0",
    "amqplib": "^0.10.3",
    "pg": "^8.12.0",
    "ioredis": "^5.10.1"
  },
  "devDependencies": {
    "@types/amqplib": "^0.10.0",
    "@types/bun": "^1.1.13",
    "typescript": "^5.1.3"
  }
}
```

### 1.3 Container Wrappers

**`postgres-container.ts`:**
```typescript
import { PostgreSqlContainer, StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Client } from 'pg';

export class PostgresTestContainer {
  private static instance?: StartedPostgreSqlContainer;
  private static clients: Map<string, Client> = new Map();

  static async start(database = 'testdb'): Promise<string> {
    if (this.instance) {
      return this.instance.getConnectionUri();
    }

    this.instance = await new PostgreSqlContainer('postgres:16-alpine')
      .withDatabase(database)
      .withUsername('postgres')
      .withPassword('postgres')
      .withReuse() // Speed up subsequent runs
      .start();

    return this.instance.getConnectionUri();
  }

  static async createDatabase(databaseName: string): Promise<void> {
    if (!this.instance) throw new Error('Container not started');

    const client = new Client({ connectionString: this.instance.getConnectionUri() });
    await client.connect();

    await client.query(`CREATE DATABASE ${databaseName}`);
    await client.end();
  }

  static async stop(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.end();
    }
    this.clients.clear();

    if (this.instance) {
      await this.instance.stop();
      this.instance = undefined;
    }
  }

  static async getClient(databaseName?: string): Promise<Client> {
    const uri = databaseName
      ? this.instance!.getConnectionUri().replace(/\/[^/]*$/, `/${databaseName}`)
      : this.instance!.getConnectionUri();

    if (!this.clients.has(uri)) {
      const client = new Client({ connectionString: uri });
      await client.connect();
      this.clients.set(uri, client);
    }

    return this.clients.get(uri)!;
  }
}
```

**`rabbitmq-container.ts`:**
```typescript
import { RabbitMQContainer, StartedRabbitMQContainer } from '@testcontainers/rabbitmq';
import * as amqp from 'amqplib';

export class RabbitMQTestContainer {
  private static instance?: StartedRabbitMQContainer;
  private static connection?: amqp.Connection;
  private static channels: Map<string, amqp.Channel> = new Map();

  static async start(): Promise<string> {
    if (this.instance) {
      return this.getAmqpUrl();
    }

    this.instance = await new RabbitMQContainer('rabbitmq:3.12-alpine')
      .withUsername('guest')
      .withPassword('guest')
      .withReuse()
      .start();

    return this.getAmqpUrl();
  }

  static getAmqpUrl(): string {
    if (!this.instance) throw new Error('Container not started');
    return `amqp://guest:guest@localhost:${this.instance.getAmqpPort()}`;
  }

  static async getConnection(): Promise<amqp.Connection> {
    if (!this.connection) {
      this.connection = await amqp.connect(this.getAmqpUrl());
    }
    return this.connection;
  }

  static async getChannel(queueName: string): Promise<amqp.Channel> {
    if (!this.channels.has(queueName)) {
      const conn = await this.getConnection();
      const channel = await conn.createChannel();
      await channel.assertQueue(queueName, { durable: true });
      this.channels.set(queueName, channel);
    }
    return this.channels.get(queueName)!;
  }

  static async purgeQueue(queueName: string): Promise<void> {
    const channel = await this.getChannel(queueName);
    await channel.purgeQueue(queueName);
  }

  static async stop(): Promise<void> {
    for (const channel of this.channels.values()) {
      await channel.close();
    }
    this.channels.clear();

    if (this.connection) {
      await this.connection.close();
      this.connection = undefined;
    }

    if (this.instance) {
      await this.instance.stop();
      this.instance = undefined;
    }
  }
}
```

**`redis-container.ts`:**
```typescript
import { RedisContainer, StartedRedisContainer } from '@testcontainers/redis';
import Redis from 'ioredis';

export class RedisTestContainer {
  private static instance?: StartedRedisContainer;
  private static clients: Map<string, Redis> = new Map();

  static async start(): Promise<string> {
    if (this.instance) {
      return this.getConnectionUrl();
    }

    this.instance = await new RedisContainer('redis:7-alpine')
      .withReuse()
      .start();

    return this.getConnectionUrl();
  }

  static getConnectionUrl(): string {
    if (!this.instance) throw new Error('Container not started');
    return this.instance.getConnectionUrl();
  }

  static async getClient(db = 0): Promise<Redis> {
    const url = `${this.getConnectionUrl()}/${db}`;

    if (!this.clients.has(url)) {
      const client = new Redis(url);
      this.clients.set(url, client);
    }

    return this.clients.get(url)!;
  }

  static async flushAll(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.flushdb();
    }
  }

  static async stop(): Promise<void> {
    for (const client of this.clients.values()) {
      await client.quit();
    }
    this.clients.clear();

    if (this.instance) {
      await this.instance.stop();
      this.instance = undefined;
    }
  }
}
```

### 1.4 Test Module Builder

**`test-module-builder.ts`:**
```typescript
import { Test, type TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RabbitMQConnection } from '@app/messaging';
import { PostgresTestContainer } from '../containers/postgres-container';
import { RabbitMQTestContainer } from '../containers/rabbitmq-container';

interface TestModuleConfig {
  entities: any[];
  providers?: any[];
  imports?: any[];
  usePostgres?: boolean;
}

export class TestModuleBuilder {
  static async build(config: TestModuleConfig): Promise<TestingModule> {
    const imports = config.imports || [];
    const providers = config.providers || [];

    if (config.usePostgres !== false) {
      const dbUrl = await PostgresTestContainer.start();
      const rabbitUrl = await RabbitMQTestContainer.start();

      imports.push(
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: dbUrl,
          entities: config.entities,
          synchronize: true,
          dropSchema: true, // Clean slate for each test
        })
      );

      providers.push({
        provide: 'RABBITMQ_CONNECTION',
        useFactory: () => new RabbitMQConnection({
          url: rabbitUrl,
          exchange: 'test-exchange',
        }),
      });
    }

    return Test.createTestingModule({
      imports,
      providers,
    }).compile();
  }
}
```

---

## Phase 2: Test Structure & Organization

### 2.1 Directory Structure

```
packages/{service}/test/
├── unit/                    # Fast tests (< 100ms each)
│   ├── domain/
│   └── application/
└── integration/             # Integration tests (real deps via containers)
    ├── repositories/
    ├── use-cases/
    ├── controllers/
    └── flows/               # Multi-service scenarios
```

### 2.2 Test Scripts

**Add to root `package.json`:**
```json
{
  "scripts": {
    "test:integration": "bun test 'packages/*/test/integration/**/*.spec.ts'",
    "test:integration:order": "bun test --cwd packages/order-service test/integration",
    "test:all": "bun test && bun run test:integration"
  }
}
```

### 2.3 Global Test Setup

**`packages/test-utils/src/setup.ts`:**
```typescript
import { PostgresTestContainer } from './containers/postgres-container';
import { RabbitMQTestContainer } from './containers/rabbitmq-container';

let setupComplete = false;

export async function globalSetup() {
  if (setupComplete) return;

  console.log('🐳 Starting Testcontainers...');
  await Promise.all([
    PostgresTestContainer.start(),
    RabbitMQTestContainer.start(),
  ]);
  setupComplete = true;
  console.log('✅ Testcontainers ready');
}

export async function globalTeardown() {
  console.log('🛑 Stopping Testcontainers...');
  await Promise.all([
    PostgresTestContainer.stop(),
    RabbitMQTestContainer.stop(),
  ]);
  console.log('✅ Testcontainers stopped');
}
```

---

## Phase 3: Service-Specific Implementation

### 3.1 Order Service Integration Tests

**`packages/order-service/test/integration/repositories/order.repository.spec.ts`:**
```typescript
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'bun:test';
import { TestModuleBuilder } from '@app/test-utils';
import { OrderEntity } from '../../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../../src/infra/database/typeorm/entities/order-item.entity';
import { PostgresOrderRepository } from '../../../src/infra/database/typeorm/repositories/order.repository.impl';
import { PostgresTestContainer } from '@app/test-utils';

describe('PostgresOrderRepository Integration', () => {
  const moduleBuilder = new TestModuleBuilder();

  beforeAll(async () => {
    await PostgresTestContainer.start();
  });

  afterAll(async () => {
    await PostgresTestContainer.stop();
  });

  beforeEach(async () => {
    const client = await PostgresTestContainer.getClient();
    await client.query('TRUNCATE TABLE orders, order_items CASCADE');
  });

  it('should save and retrieve order', async () => {
    const module = await moduleBuilder.build({
      entities: [OrderEntity, OrderItemEntity],
      providers: [PostgresOrderRepository],
    });

    const repo = module.get<PostgresOrderRepository>(PostgresOrderRepository);

    const order = Order.reconstitute({
      id: 'order-1',
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      status: OrderStatus.PENDING,
      items: [],
      totalAmount: Money.BRL(5000),
      version: 1,
    });

    await repo.save(order);

    const found = await repo.findById('order-1');
    expect(found).not.toBeNull();
    expect(found!.getId()).toBe('order-1');
  });
});
```

### 3.2 Consumer Integration Tests

**`packages/order-service/test/integration/consumers/cart.consumer.spec.ts`:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestModuleBuilder } from '@app/test-utils';
import { OrderEntity, OrderItemEntity } from '../../../src/infra/database/typeorm/entities';
import { CartConsumer } from '../../../src/infra/messaging/rabbitmq/cart-consumer';
import { PostgresTestContainer, RabbitMQTestContainer } from '@app/test-utils';

describe('CartConsumer Integration', () => {
  let module: TestingModule;
  let consumer: CartConsumer;

  beforeAll(async () => {
    await Promise.all([
      PostgresTestContainer.start(),
      RabbitMQTestContainer.start(),
    ]);

    module = await TestModuleBuilder.build({
      entities: [OrderEntity, OrderItemEntity],
      providers: [CartConsumer, CreateOrderFromCartUseCase],
    });

    consumer = module.get(CartConsumer);
  });

  afterAll(async () => {
    await module.close();
    await Promise.all([
      PostgresTestContainer.stop(),
      RabbitMQTestContainer.stop(),
    ]);
  });

  it('should create order from cart event', async () => {
    const channel = await RabbitMQTestContainer.getChannel('cart.checked-out');

    const event = {
      cartId: 'cart-1',
      customerId: 'customer-1',
      restaurantId: 'restaurant-1',
      items: [{ productId: 'p-1', quantity: 2, unitPrice: 2500 }],
    };

    await channel.publish('food-ordering', 'cart.checked-out', Buffer.from(JSON.stringify(event)));

    // Wait for async processing
    await new Promise(resolve => setTimeout(resolve, 1000));

    const client = await PostgresTestContainer.getClient('orders');
    const result = await client.query('SELECT * FROM orders WHERE customer_id = $1', ['customer-1']);

    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].restaurant_id).toBe('restaurant-1');
  });
});
```

---

## Phase 4: E2E Flow Tests

### 4.1 Order-to-Payment Flow

**`test/e2e/order-payment-flow.spec.ts`:**
```typescript
import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { PostgresTestContainer, RabbitMQTestContainer } from '@app/test-utils';

describe('Order → Payment E2E Flow', () => {
  beforeAll(async () => {
    await Promise.all([
      PostgresTestContainer.createDatabase('orders'),
      PostgresTestContainer.createDatabase('payments'),
      RabbitMQTestContainer.start(),
    ]);

    // Start both services
    await startOrderService();
    await startPaymentService();
  });

  afterAll(async () => {
    await Promise.all([
      PostgresTestContainer.stop(),
      RabbitMQTestContainer.stop(),
    ]);
  });

  it('should complete order-to-payment flow', async () => {
    // 1. Create order via HTTP
    const response = await fetch('http://localhost:3001/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerId: 'customer-1',
        restaurantId: 'restaurant-1',
        items: [{ productId: 'p-1', quantity: 2, unitPrice: 2500 }],
      }),
    });

    const { orderId } = await response.json();

    // 2. Verify order.created event
    const events = await RabbitMQTestContainer.getEvents('order.created');
    expect(events.some(e => e.payload.orderId === orderId)).toBe(true);

    // 3. Verify payment was created
    const paymentClient = await PostgresTestContainer.getClient('payments');
    const result = await paymentClient.query('SELECT * FROM payments WHERE order_id = $1', [orderId]);
    expect(result.rows).toHaveLength(1);
  });
});
```

---

## Phase 5: CI/CD Integration

### 5.1 GitHub Actions Configuration

**`.github/workflows/test.yml`:**
```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      docker:
        image: docker:dind
        options: --privileged
    steps:
      - uses: actions/checkout@v4

      - uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Run unit tests
        run: bun test

      - name: Run integration tests
        run: bun test 'packages/*/test/integration/**/*.spec.ts'
        env:
          TESTCONTAINERS_REUSE_ENABLE: false
```

---

## Best Practices & Guidelines

### 1. Container Reuse Strategy
- **Development**: Enable reuse (`TESTCONTAINERS_REUSE_ENABLE=true`) for speed
- **CI**: Disable reuse for isolation
- Use deterministic container configs (same tag, same ports)

### 2. Test Isolation
- Each test cleans its own data
- Use `dropSchema: true` in TypeORM config
- Purge RabbitMQ queues between tests

### 3. Performance
- Unit tests: < 100ms each, no containers
- Integration tests: ~500ms each, shared containers
- E2E tests: ~2s each, full stack

### 4. Naming Conventions
- `*.unit.spec.ts` - Pure unit tests
- `*.integration.spec.ts` - Single service with real deps
- `*.e2e.spec.ts` - Multi-service flows

---

## Migration Path

### Week 1: Foundation
1. Create `@app/test-utils` package
2. Implement container wrappers
3. Add dependencies to root workspace

### Week 2: Order Service
1. Migrate repository tests to integration
2. Add consumer integration tests
3. Validate with existing tests

### Week 3: Other Services
1. Payment service tests
2. Kitchen service tests
3. Cart service tests

### Week 4: E2E Flows
1. Order-to-payment flow
2. Payment-to-kitchen flow
3. Cart-to-order flow

---

## Success Metrics

- ✅ All integration tests pass without external infrastructure
- ✅ Test suite completes in < 5 minutes
- ✅ Container reuse reduces startup time by 80%
- ✅ Zero false positives from environment issues
