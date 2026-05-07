import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { TestCompose } from '@app/test-utils';
import { Test } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderEntity } from '../../../src/infra/database/typeorm/entities/order.entity';
import { OrderItemEntity } from '../../../src/infra/database/typeorm/entities/order-item.entity';
import { ORDER_REPOSITORY, EVENT_PUBLISHER, RABBITMQ_CONNECTION } from '../../../src/tokens';
import { RabbitMQConnection } from '@app/messaging';
import { RabbitMQEventPublisher } from '../../../src/infra/messaging/rabbitmq/order-event.publisher';
import { PostgresOrderRepository } from '../../../src/infra/database/typeorm/repositories/order.repository.impl';
import { CreateOrderFromCartUseCase } from '../../../src/application/use-cases/create-order-from-cart/create-order-from-cart.use-case';

describe('CartConsumer Integration Tests (Docker Compose)', () => {
  let connections: Record<string, string>;

  beforeAll(async () => {
    console.log('[beforeAll] Starting Docker Compose environment...');

    connections = await TestCompose.start({
      services: ['postgres-order', 'rabbitmq'],
      env: { TEST_MODE: 'integration' },
    });

    console.log('[beforeAll] Environment started');
  }, { timeout: 120000 });

  afterAll(async () => {
    console.log('[afterAll] Stopping Docker Compose environment...');
    await TestCompose.stop({ removeVolumes: false, timeout: 30000 });
    console.log('[afterAll] Environment stopped');
  }, { timeout: 30000 });

  it('should have RabbitMQ connection available', async () => {
    // Verify RabbitMQ is accessible via management API
    const response = await fetch('http://localhost:15672/api/overview', {
      headers: {
        'Authorization': 'Basic ' + Buffer.from('guest:guest').toString('base64'),
      },
    });

    expect(response.ok).toBe(true);
  }, { timeout: 10000 });

  it('should create order from cart use case', async () => {
    const module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          url: connections.orderDatabase,
          entities: [OrderEntity, OrderItemEntity],
          synchronize: true,
          dropSchema: false,
        }),
      ],
      providers: [
        {
          provide: RABBITMQ_CONNECTION,
          useFactory: () => new RabbitMQConnection({
            url: connections.rabbitmqUrl,
            exchange: 'food-ordering',
          }),
        },
        {
          provide: EVENT_PUBLISHER,
          useFactory: (conn: RabbitMQConnection) => new RabbitMQEventPublisher(conn),
          inject: [RABBITMQ_CONNECTION],
        },
        {
          provide: ORDER_REPOSITORY,
          useFactory: (dataSource: DataSource) => new PostgresOrderRepository(dataSource),
          inject: [DataSource],
        },
        CreateOrderFromCartUseCase,
      ],
    }).compile();

    const useCase = module.get<CreateOrderFromCartUseCase>(CreateOrderFromCartUseCase);

    const result = await useCase.execute({
      cartId: uuidv4(),
      customerId: uuidv4(),
      restaurantId: uuidv4(),
      items: [
        {
          productId: 'product-1',
          productName: 'X-Burger',
          quantity: 2,
          priceCents: 5000,
        },
      ],
      totalAmountCents: 10000,
    });

    expect(result.orderId).toBeDefined();
    expect(result.status).toBe('PENDING');

    await module.close();
  }, { timeout: 30000 });
});
