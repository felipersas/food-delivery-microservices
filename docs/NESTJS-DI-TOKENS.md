# NestJS Dependency Injection Tokens

This document explains how dependency injection (DI) tokens work in NestJS, following the official best practices from [NestJS Custom Providers documentation](https://docs.nestjs.com/fundamentals/custom-providers).

---

## Table of Contents

- [The Problem: TypeScript Interfaces](#the-problem-typescript-interfaces)
- [The Solution: Injection Tokens](#the-solution-injection-tokens)
- [Token Types](#token-types)
- [useFactory and inject Explained](#usefactory-and-inject-explained)
- [Using @Inject() in Constructors](#using-inject-in-constructors)
- [Why String Constants Instead of Inline Strings](#why-string-constants-instead-of-inline-strings)
- [Complete Example](#complete-example)
- [Runtime Flow](#runtime-flow)
- [Benefits of This Approach](#benefits-of-this-approach)

---

## The Problem: TypeScript Interfaces

```typescript
// ❌ This DOESN'T WORK
interface EventPublisher {
  publishAll(events): Promise<void>;
}

constructor(private publisher: EventPublisher) {}
//                               ^^^^^^^^^^^^^
//                               TypeScript erases interfaces at runtime!
```

TypeScript interfaces **don't exist at runtime**. When compiled to JavaScript, `EventPublisher` disappears entirely. NestJS needs something that exists in runtime to identify dependencies in the DI container.

---

## The Solution: Injection Tokens

NestJS uses **tokens** to identify dependencies in the container:

```typescript
// ✅ String as token
{ provide: 'EventPublisher', useFactory: ... }

// ✅ Class as token
{ provide: RabbitMQEventPublisher, ... }

// ✅ Constant (recommended by official docs)
const EVENT_PUBLISHER = 'EventPublisher';
{ provide: EVENT_PUBLISHER, ... }
```

---

## Token Types

### 1. String Tokens

```typescript
{ provide: 'Connection', useValue: connection }
```

### 2. Class Tokens

```typescript
{ provide: RabbitMQConnection, useClass: RabbitMQConnection }
```

### 3. Symbol Tokens

```typescript
const CONNECTION = Symbol('Connection');
{ provide: CONNECTION, useValue: connection }
```

### 4. String Constants (Recommended)

```typescript
// tokens.ts
export const EVENT_PUBLISHER = 'EventPublisher';

// module.ts
{ provide: EVENT_PUBLISHER, ... }
```

**According to NestJS docs:** "For maintainability, it is considered a best practice to define these tokens as constants in a separate file."

---

## useFactory and inject Explained

```typescript
{
  provide: EVENT_PUBLISHER,        // ← TOKEN (key in container)
  useFactory: (rabbit) =>          // ← HOW to create the instance
    new RabbitMQEventPublisher(rabbit),
  inject: [RABBITMQ_CONNECTION],   // ← DEPENDENCIES needed
}
```

### Execution Flow

```
1. Someone requests: EventPublisher
           ↓
2. NestJS searches for provider with token EVENT_PUBLISHER
           ↓
3. Finds { provide: EVENT_PUBLISHER, ... }
           ↓
4. Looks at inject: [RABBITMQ_CONNECTION]
           ↓
5. Searches for RABBITMQ_CONNECTION in container
           ↓
6. Calls useFactory(resolvedRabbitConnection)
           ↓
7. Factory creates: new RabbitMQEventPublisher(rabbit)
           ↓
8. Registers as EVENT_PUBLISHER and returns
```

### With Multiple Dependencies

```typescript
{
  provide: 'SomeComplexService',
  useFactory: (repo, publisher, config) =>
    new SomeComplexService(repo, publisher, config),
  inject: [REPOSITORY_TOKEN, PUBLISHER_TOKEN, ConfigService],
}
```

The `inject` array order must match the factory function parameters!

---

## Using @Inject() in Constructors

```typescript
constructor(
  @Inject(EVENT_PUBLISHER)
  private publisher: EventPublisher
) {}
```

- `@Inject(TOKEN)` tells NestJS which dependency to inject
- `EventPublisher` is just **TypeScript type** (for autocomplete/type safety)
- Only `EVENT_PUBLISHER` matters at runtime

### Without @Inject() (Class Tokens)

```typescript
// When using class tokens, @Inject() is optional
constructor(
  private readonly connection: RabbitMQConnection  // Works automatically
) {}
```

### With @Inject() (String/Symbol Tokens)

```typescript
// Required for non-class tokens
constructor(
  @Inject('RabbitMQConnection')
  private readonly connection: RabbitMQConnection
) {}
```

---

## Why String Constants Instead of Inline Strings?

```typescript
// ❌ BEFORE (magic strings)
{
  provide: 'EventPublisher',        // Typo risk!
  inject: ['EventPublisher'],      // No autocomplete!
}

// ✅ AFTER (constants)
// tokens.ts
export const EVENT_PUBLISHER = 'EventPublisher';

// module.ts
{ provide: EVENT_PUBLISHER, ... }
{ inject: [EVENT_PUBLISHER] }
```

### Advantages

1. **Auto-completion** - IDE suggests the constant
2. **Refactor-safe** - renaming affects all usages
3. **Single source of truth** - value defined in one place
4. **Type-safe** - error if you typo the constant name
5. **Easy to find references** - IDE can find all usages

---

## Complete Example

```typescript
// ========== tokens.ts ==========
export const EVENT_PUBLISHER = 'EventPublisher';
export const RABBITMQ_CONNECTION = 'RabbitMQConnection';
export const ORDER_REPOSITORY = 'OrderRepository';

// ========== order.module.ts ==========
@Module({
  providers: [
    {
      provide: RABBITMQ_CONNECTION,
      useFactory: (config: ConfigService) =>
        new RabbitMQConnection({ url: config.get('RABBITMQ_URL') }),
      inject: [ConfigService],
    },
    {
      provide: EVENT_PUBLISHER,
      useFactory: (rabbit: RabbitMQConnection) =>
        new RabbitMQEventPublisher(rabbit),
      inject: [RABBITMQ_CONNECTION],
    },
    {
      provide: ORDER_REPOSITORY,
      useClass: InMemoryOrderRepository,
    },
    {
      provide: CreateOrderUseCase,
      useFactory: (repo: OrderRepository, publisher: EventPublisher) =>
        new CreateOrderUseCase(repo, publisher),
      inject: [ORDER_REPOSITORY, EVENT_PUBLISHER],
    },
  ],
})

// ========== create-order.use-case.ts ==========
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private repo: OrderRepository,
    @Inject(EVENT_PUBLISHER) private publisher: EventPublisher,
  ) {}

  async execute(input: CreateOrderInput) {
    const order = Order.create(input);
    await this.repo.save(order);

    const events = order.getDomainEvents();
    await this.publisher.publishAll(events);
  }
}
```

---

## Runtime Flow

```
┌─────────────────────────────────────────────────────────────┐
│  1. Application starts                                     │
│     → NestJS reads all @Module() definitions                │
│     → Registers providers in DI Container                   │
│     │                                                        │
│     Container: {                                            │
│       'EventPublisher' → RabbitMQEventPublisher instance    │
│       'RabbitMQConnection' → RabbitMQConnection instance    │
│       'OrderRepository' → InMemoryOrderRepository instance  │
│     }                                                       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  2. CreateOrderUseCase needs to be instantiated            │
│     → NestJS sees constructor dependencies                   │
│     → @Inject(ORDER_REPOSITORY) → searches container         │
│     → @Inject(EVENT_PUBLISHER) → searches container          │
│     → Injects found instances                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│  3. execute() method is called                             │
│     await this.publisher.publishAll(events);                │
│             │                                               │
│             ▼                                               │
│     RabbitMQEventPublisher.publishAll()                    │
│             │                                               │
│             ▼                                               │
│     this.connection.publish(...)                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Benefits of This Approach

### 1. Decoupling Implementation from Interface

```typescript
// Easy to swap implementation
{
  provide: EVENT_PUBLISHER,
  useFactory: (rabbit) => new SQSEventPublisher(rabbit),  // AWS SQS
  inject: [RABBITMQ_CONNECTION],
}

// Use case doesn't change!
await this.publisher.publishAll(events);  // Still works
```

### 2. Testability

```typescript
// In tests, provide mock implementation
{
  provide: EVENT_PUBLISHER,
  useClass: MockEventPublisher,
}
```

### 3. Clear Dependencies

```typescript
constructor(
  @Inject(ORDER_REPOSITORY) private repo: OrderRepository,
  @Inject(EVENT_PUBLISHER) private publisher: EventPublisher,
) {}
```

At a glance, you know exactly what this class needs.

### 4. Consistency Across Services

All services use the same pattern:
- `tokens.ts` - defines all tokens
- `*.module.ts` - registers providers with tokens
- `*.ts` - injects with `@Inject(TOKEN)`

---

## Analogy: Restaurant Menu

```typescript
// MENU (tokens.ts)
const FEIJOADA_DISH = 'FeijoadaDish';

// KITCHEN (module.ts)
{
  provide: FEIJOADA_DISH,
  useFactory: () => new FeijoadaCompleta(),
}

// ORDER (use case)
constructor(
  @Inject(FEIJOADA_DISH)
  private dish: Dish  // Generic type
) {}

// EATING
this.dish.eat();
// Actually eating: FeijoadaCompleta
```

---

## Key Takeaways

| Concept | Description |
|---------|-------------|
| **Token** | Key used to register/find dependency in container |
| **Provider** | Object telling NestJS how to create a dependency |
| **useFactory** | Function that creates the instance |
| **inject** | Array of tokens to resolve and pass to factory |
| **@Inject()** | Decorator telling NestJS which token to inject |
| **TypeScript type** | Compile-time only, erased at runtime |
| **Constant tokens** | Recommended approach, defined in separate file |

---

## References

- [NestJS Custom Providers](https://docs.nestjs.com/fundamentals/custom-providers)
- [NestJS Dependency Injection](https://docs.nestjs.com/providers)
- [NestJS Advanced DI](https://docs.nestjs.com/advanced-dependency-injection)
