---
name: code-patterns
description: Enforce project code patterns and conventions
triggers:
  - "code patterns"
  - "conventions"
  - "project style"
  - "ddd patterns"
tags: [standards, ddd, conventions]
---

# Code Patterns - Food Delivery Microservices

## Domain Layer Patterns

### Aggregate Rules
1. **Inherit from `AggregateRoot<string>`**
2. **Private fields only** - no public setters
3. **Factory methods**: `static create()` for new, `static reconstitute()` for persistence
4. **State transitions** via methods that validate and emit domain events
5. **Getters only** - expose data immutably
6. **Domain events** added before state change
7. **Version increment** on state change

```typescript
// ✅ GOOD
export class Order extends AggregateRoot<string> {
  private status: OrderStatus;

  confirm(): void {
    this.transitionTo(OrderStatus.confirmed());
    this.addDomainEvent({ /* order.confirmed */ });
    this.incrementVersion();
  }

  getStatus(): OrderStatusEnum {
    return this.status.value;
  }
}

// ❌ BAD
export class Order {
  public status: OrderStatus;  // Public field
  setStatus(status: OrderStatus): void { }  // Setter
}
```

### Value Object Rules
1. **Inherit from `ValueObject<T>`**
2. **Immutable props** via `Object.freeze()`
3. **Factory method**: `static create()` with validation
4. **Private constructor**
5. **Getters for props**
6. **No identity** - equality via props

```typescript
// ✅ GOOD
export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  static create(amount: number): Money {
    if (amount < 0) throw new DomainException('Money cannot be negative');
    return new Money({ amount, currency: 'BRL' });
  }

  get amount(): number { return this.props.amount; }
}

// ❌ BAD
export class Money {
  constructor(public amount: number) { }  // Public, no validation
}
```

### Repository Interface Rules
1. **Extend base `Repository<T>`** interface
2. **Named after aggregate**: `XxxRepository`
3. **Return domain objects**, never entities
4. **Located in**: `domain/repositories/`

```typescript
// ✅ GOOD
export interface OrderRepository extends Repository<Order> {}

// ❌ BAD
export interface IOrderDao { }  // Not following naming/location
```

## Application Layer Patterns

### Use Case Rules
1. **`@Injectable()` decorator**
2. **Inject via constructor** with `@Inject(TOKEN)`
3. **Single public method**: `execute()`
4. **Input DTO → Domain → Output DTO** flow
5. **Transaction boundary**: save + publish events
6. **Located in**: `application/use-cases/{name}/`

```typescript
// ✅ GOOD
@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly repo: OrderRepository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    const order = Order.create(input);
    await this.repo.save(order);
    await this.publisher.publishAll(order.getDomainEvents());
    order.clearDomainEvents();
    return { orderId: order.getId() };
  }
}
```

### DTO Rules
1. **Use `class-validator`** decorators
2. **Use `class-transformer`** for nested types
3. **OpenAPI decorators** (`@ApiProperty`)
4. **Export types**: `Input` = DTO, `Output` = interface
5. **Located in**: same directory as use case

```typescript
// ✅ GOOD
export class CreateOrderDto {
  @ApiProperty({ example: '123' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export type CreateOrderInput = CreateOrderDto;
export interface CreateOrderOutput { orderId: string; }
```

## Infrastructure Layer Patterns

### Controller Rules
1. **Thin layer** - delegate to use cases
2. **`@ApiTags()`** decorator
3. **`@ApiOperation()`** on all routes
4. **`@ApiResponse()`** for success/error cases
5. **No business logic** - only HTTP concerns

```typescript
// ✅ GOOD
@ApiTags('orders')
@Controller('orders')
export class OrderController {
  constructor(private readonly createOrderUseCase: CreateOrderUseCase) {}

  @Post()
  @ApiOperation({ summary: 'Create order' })
  @ApiResponse({ status: 201 })
  async create(@Body() input: CreateOrderDto) {
    return this.createOrderUseCase.execute(input);
  }
}

// ❌ BAD
@Post()
async create(@Body() input: CreateOrderDto) {
  if (input.items.length === 0) { /* Business logic in controller! */ }
}
```

### Entity Rules (TypeORM)
1. **Match domain fields** 1:1
2. **Use `@Entity()`** decorator
3. **Primary column `@PrimaryColumn()`**
4. **Relations lazy** to avoid lazy loading issues
5. **`@CreateDateColumn` / `@UpdateDateColumn`**

```typescript
// ✅ GOOD
@Entity('orders')
export class OrderEntity {
  @PrimaryColumn('uuid')
  id: string;

  @Column()
  customerId: string;

  @Column()
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
```

### Repository Implementation Rules
1. **`@Injectable()` decorator**
2. **Work with entities**, return aggregates
3. **Use `reconstitute()`** to rebuild domain
4. **Handle version** for optimistic locking

```typescript
// ✅ GOOD
@Injectable()
export class PostgresOrderRepository implements OrderRepository {
  async findById(id: string): Promise<Order | null> {
    const entity = await this.repo.findOne({ where: { id } });
    if (!entity) return null;
    return Order.reconstitute({ /* map entity to domain */ });
  }
}
```

### Event Publisher Rules
1. **Interface** in messaging folder
2. **Implement** with RabbitMQ
3. **Publish all events** from aggregate
4. **Clear events** after publish

```typescript
export interface EventPublisher {
  publishAll(events: ReadonlyArray<DomainEvent>): Promise<void>;
}

export class RabbitMQEventPublisher implements EventPublisher {
  async publishAll(events: ReadonlyArray<DomainEvent>): Promise<void> {
    for (const event of events) {
      await this.connection.publish(event.eventType, event);
    }
  }
}
```

### Event Consumer Rules
1. **`@Injectable()` decorator**
2. **`start()` method** called in `OnModuleInit`
3. **Subscribe to events** via RabbitMQ connection
4. **Rehydrate aggregate** from repo
5. **Apply state change** + save
6. **Clear events** (no re-publish)

## Module Patterns

### Dependencies
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], validationSchema, isGlobal: true }),
    ...(usePostgres ? [TypeOrmModule.forRoot({ ... })] : []),
  ],
  controllers: [/* controllers */],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
    { provide: RABBITMQ_CONNECTION, useFactory: ... },
    { provide: REPOSITORY, useClass: usePostgres ? PostgresRepo : InMemoryRepo },
    { provide: EVENT_PUBLISHER, useFactory: ... },
    /* use cases */
    /* consumer */
  ],
})
export class ServiceModule implements OnModuleInit { }
```

## Token Convention

```typescript
// tokens.ts - uppercase snake case
export const RABBITMQ_CONNECTION = 'RabbitMQConnection';
export const ORDER_REPOSITORY = 'OrderRepository';
export const EVENT_PUBLISHER = 'EventPublisher';
```

## Configuration Convention

```typescript
// configuration.ts - factory function
export default () => ({
  port: parseInt(process.env.SERVICE_PORT ?? '3001', 10),
  databaseUrl: process.env.SERVICE_DATABASE_URL ?? '...',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://...',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});

// validation.ts - Joi schema
export const validationSchema = Joi.object({
  SERVICE_PORT: Joi.number().default(3001),
  SERVICE_DATABASE_URL: Joi.string().default('...'),
});
```

## Event Naming Convention

- **lowercase.dot.separated**
- **Past tense for completed actions**: `order.created`, `payment.confirmed`
- **Noun for state changes**: `order.ready` (not `order.became_ready`)

## Error Handling

- **Use `DomainException`** for business rule violations
- **Use `InvalidStateException`** for invalid state/value
- **Let NestJS handle HTTP** via `AllExceptionsFilter`

```typescript
// ✅ GOOD
if (order.items.length === 0) {
  throw new DomainException('Order must have at least one item');
}
```

## Testing Patterns

- **Unit tests**: Use in-memory repositories
- **Integration tests**: Use PostgreSQL testcontainers (future)
- **Test domain logic** in isolation from infrastructure

## Anti-Patterns to Avoid

❌ Anemic domain model (getters/setters only)
❌ Business logic in controllers
❌ Direct entity exposure from use cases
❌ Events published before transaction commit
❌ Missing version handling in repositories
❌ Public fields in aggregates/value objects
❌ Constructor without factory method
