---
name: service-scaffolder
description: Generate new microservice structure following project DDD patterns
triggers:
  - "create service"
  - "new service"
  - "scaffold service"
  - "add microservice"
tags: [architecture, ddd, scaffolding]
---

# Service Scaffolder

Generate new microservice structure following project DDD patterns.

## Project Patterns

### Directory Structure
```
packages/{service-name}/
├── src/
│   ├── domain/
│   │   ├── aggregates/          # AggregateRoot classes
│   │   ├── value-objects/       # ValueObject classes (*.vo.ts)
│   │   ├── repositories/        # Repository interfaces
│   │   └── events/              # Domain events (optional)
│   ├── application/
│   │   ├── use-cases/           # Use cases
│   │   │   └── {use-case}/
│   │   │       ├── {use-case}.use-case.ts
│   │   │       └── {use-case}.dto.ts
│   ├── infra/
│   │   ├── database/
│   │   │   ├── memory/          # In-memory repos (test/dev)
│   │   │   └── typeorm/         # PostgreSQL entities + repos
│   │   ├── http/                # Controllers
│   │   └── messaging/           # RabbitMQ consumers/publishers
│   ├── config/
│   │   ├── configuration.ts     # Config factory
│   │   └── validation.ts        # Joi schema
│   ├── tokens.ts                # DI tokens
│   ├── main.ts                  # Bootstrap
│   └── {service}.module.ts      # NestJS module
├── package.json
└── tsconfig.json
```

### Aggregate Root Pattern
```typescript
import { AggregateRoot, DomainException } from '@app/shared';
import { v4 as uuidv4 } from 'uuid';

export class {Aggregate} extends AggregateRoot<string> {
  // Private fields only
  private field: Type;

  constructor(props: { id?: string; ... }) {
    super(props.id ?? uuidv4());
    this.field = props.field;
    // ... initialize
  }

  static reconstitute(props: {
    id: string;
    ...fields;
    version: number;
  }): {Aggregate} {
    const entity = new {Aggregate}({ id: props.id, ... });
    (entity as any).field = props.field;
    // ... restore version
    for (let i = 0; i < props.version; i++) {
      entity.incrementVersion();
    }
    return entity;
  }

  static create(props: { ... }): {Aggregate} {
    // Validation
    if (invalid) {
      throw new DomainException('message');
    }

    const entity = new {Aggregate}(props);

    entity.addDomainEvent({
      eventId: uuidv4(),
      eventType: '{entity}.created',
      occurredAt: new Date().toISOString(),
      aggregateId: entity.getId(),
      aggregateType: '{Aggregate}',
      data: { ... },
    });

    return entity;
  }

  // Business methods with state transitions
  doSomething(): void {
    // Validate state transition
    this.addDomainEvent({ /* event */ });
    this.incrementVersion();
  }

  // Getters only (no setters)
  getField(): Type { return this.field; }
}
```

### Value Object Pattern
```typescript
import { ValueObject, InvalidStateException } from '@app/shared';

export interface {VoName}Props {
  field: Type;
}

export class {VoName} extends ValueObject<{VoName}Props> {
  private constructor(props: {VoName}Props) {
    super(props);
  }

  static create(props: {VoName}Props): {VoName} {
    {VoName}.validate(props);
    return new {VoName}(props);
  }

  private static validate(props: {VoName}Props): void {
    if (!props.field) {
      throw new InvalidStateException('Field is required');
    }
  }

  get field(): Type {
    return this.props.field;
  }
}
```

### Use Case Pattern
```typescript
@Injectable()
export class {UseCase}UseCase {
  constructor(
    @Inject(REPOSITORY_TOKEN) private readonly repo: Repository,
    @Inject(EVENT_PUBLISHER) private readonly publisher: EventPublisher,
  ) {}

  async execute(input: InputType): Promise<OutputType> {
    // 1. Map DTOs to domain objects
    // 2. Call aggregate factory
    const aggregate = {Aggregate}.create(input);

    // 3. Persist
    await this.repo.save(aggregate);

    // 4. Publish events
    const events = aggregate.getDomainEvents();
    await this.publisher.publishAll(events);
    aggregate.clearDomainEvents();

    // 5. Return output
    return { ... };
  }
}
```

### Controller Pattern
```typescript
@ApiTags('{resource}')
@Controller('{resource}s')
export class {Resource}Controller {
  constructor(private readonly useCase: {UseCase}UseCase) {}

  @Post()
  @ApiOperation({ summary: '...' })
  @ApiResponse({ status: 201, type: OutputDto })
  async create(@Body() input: InputDto) {
    return this.useCase.execute(input);
  }
}
```

### Repository Pattern
```typescript
// Interface in domain/repositories/
export interface {Aggregate}Repository extends Repository<{Aggregate}> {}

// TypeORM implementation
@Injectable()
export class Postgres{Aggregate}Repository implements {Aggregate}Repository {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  async findById(id: string): Promise<{Aggregate} | null> {
    // Query and reconstitute
  }

  async save(aggregate: {Aggregate}): Promise<void> {
    // Upsert with version
  }

  async delete(id: string): Promise<void> {
    // Soft delete preferred
  }
}
```

### Event Consumer Pattern
```typescript
@Injectable()
export class {Service}Consumer {
  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    @Inject(REPOSITORY_TOKEN) private readonly repo: Repository,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      '{service}-events',
      ['event.to.listen'],
      async (event: DomainEvent) => {
        const aggregate = await this.repo.findById(event.data.aggregateId);
        if (!aggregate) return;

        // Apply state transition
        await this.repo.save(aggregate);
        aggregate.clearDomainEvents();
      },
    );
  }
}
```

### Module Pattern
```typescript
const usePostgres = process.env.DB_DRIVER === 'postgres';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [configuration],
      validationSchema,
      isGlobal: true,
    }),
    ...(usePostgres ? [TypeOrmModule.forRoot({ ... })] : []),
  ],
  controllers: [{Controller}, HealthController],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: SuccessResponseInterceptor },
    { provide: RABBITMQ_CONNECTION, useFactory: (config: ConfigService) => new RabbitMQConnection({ ... }), inject: [ConfigService] },
    { provide: REPOSITORY_TOKEN, useClass: usePostgres ? PostgresRepo : InMemoryRepo },
    { provide: EVENT_PUBLISHER, useFactory: (conn: RabbitMQConnection) => new EventPublisher(conn), inject: [RABBITMQ_CONNECTION] },
    // Use cases
    // Consumer
  ],
})
export class {Service}Module implements OnModuleInit {
  constructor(private readonly consumer: {Service}Consumer) {}

  async onModuleInit() {
    await this.consumer.start();
  }
}
```

### Bootstrap Pattern
```typescript
async function bootstrap() {
  const app = await NestFactory.create({Service}Module);

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
    exceptionFactory: (errors) => new BadRequestException({ message: 'Validation failed', errors: ... }),
  }));

  const config = new DocumentBuilder()
    .setTitle('{Service} Service API')
    .setDescription('...')
    .setVersion('1.0')
    .addTag('{resource}s')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
  app.use('/api', (req, res, next) => {
    if (req.method === 'GET' && req.url === '/') {
      res.set('Content-Type', 'text/html').send(scalarHtml('/api/docs-json', '{Service} Service API'));
    } else {
      next();
    }
  });

  const port = configService.get<number>('port');
  await app.listen(port);

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    await app.close();
    process.exit(0);
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}
```

### Configuration Pattern
```typescript
// configuration.ts
export default () => ({
  port: parseInt(process.env.{SERVICE_UPPER}_PORT ?? '300X', 10),
  databaseUrl: process.env.{SERVICE_UPPER}_DATABASE_URL ?? 'postgres://postgres:postgres@localhost:543X/{service}',
  rabbitmq: {
    url: process.env.RABBITMQ_URL ?? 'amqp://guest:guest@localhost:5672',
    exchange: process.env.RABBITMQ_EXCHANGE ?? 'food-ordering',
  },
});

// validation.ts
export const validationSchema = Joi.object({
  {SERVICE_UPPER}_PORT: Joi.number().default(300X),
  {SERVICE_UPPER}_DATABASE_URL: Joi.string().default('postgres://postgres:postgres@localhost:543X/{service}'),
});
```

### Naming Conventions
- Files: kebab-case (`order.controller.ts`, `create-order.dto.ts`)
- Classes: PascalCase (`OrderController`, `CreateOrderUseCase`)
- Interfaces: PascalCase (`OrderRepository`, `CreateOrderInput`)
- Tokens: UPPER_SNAKE_CASE (`ORDER_REPOSITORY`)
- Events: lowercase.dot.separated (`order.created`)
- Routes: plural (`/orders`, `/customers`)
- Value Objects: suffix with `.vo.ts`

## Required Files Checklist

For each new service:
- [ ] `src/domain/aggregates/{aggregate}.aggregate.ts`
- [ ] `src/domain/value-objects/{name}.vo.ts`
- [ ] `src/domain/repositories/{aggregate}.repository.interface.ts`
- [ ] `src/application/use-cases/{use-case}/{use-case}.use-case.ts`
- [ ] `src/application/use-cases/{use-case}/{use-case}.dto.ts`
- [ ] `src/infra/database/memory/{aggregate}.repository.ts`
- [ ] `src/infra/database/typeorm/entities/{aggregate}.entity.ts`
- [ ] `src/infra/database/typeorm/repositories/{aggregate}.repository.impl.ts`
- [ ] `src/infra/http/{resource}.controller.ts`
- [ ] `src/infra/messaging/rabbitmq/{service}-event.publisher.ts`
- [ ] `src/infra/messaging/rabbitmq/{service}.consumer.ts`
- [ ] `src/config/configuration.ts`
- [ ] `src/config/validation.ts`
- [ ] `src/tokens.ts`
- [ ] `src/main.ts`
- [ ] `src/{service}.module.ts`
- [ ] `package.json`
- [ ] `tsconfig.json`

## Environment Variables
Add to root `.env`:
```
{SERVICE_UPPER}_PORT=300X
{SERVICE_UPPER}_DATABASE_URL=postgresql://postgres:postgres@localhost:543X/{service}
```

Add to root `package.json` scripts:
```json
"dev:{service}": "bun run --workspace packages/{service}-service/src/main.ts",
"test:{service}": "bun test --workspace packages/{service}-service"
```
