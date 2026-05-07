# Cart Checkout → Order Integration - Implementation Plan

## Overview

**Feature**: Event-driven integration between Cart Service checkout and Order Service creation.

**Problem**: Cart checkout emits `cart.checked-out` event but no consumer processes it. Orders are not automatically created.

**Solution**: Add event consumer in Order Service to listen to `cart.checked-out` and create orders automatically.

## Current Flow (Broken)

```
User → API Gateway → Cart Service → Checkout
  ├─ Cart.status = CHECKED_OUT
  ├─ Emit: cart.checked-out
  └─ Returns: orderId (fake UUID)
      ↓
   [NO CONSUMER] ✗
```

## Target Flow (Fixed)

```
User → API Gateway → Cart Service → Checkout
  ├─ Cart.status = CHECKED_OUT
  ├─ Emit: cart.checked-out
  └─ Returns: cartId
      ↓
Order Service Consumer
  ├─ Listen: cart.checked-out
  ├─ Create: Order aggregate
  ├─ Emit: order.created
  └─ Persist: Order
      ↓
Payment Service Consumer
  ├─ Listen: order.created
  ├─ Process: Payment
  └─ Emit: payment.confirmed OR payment.rejected
```

## Domain Changes

### Cart Service
**Files to modify**:
- `packages/cart-service/src/application/use-cases/checkout-cart/checkout-cart.use-case.ts`
- `packages/cart-service/src/application/use-cases/checkout-cart/checkout-cart.dto.ts`

**Changes**:
1. Remove fake `orderId` generation from CheckoutCartUseCase
2. Return only `cartId` in output (order will be created asynchronously)
3. Keep `cart.checked-out` event emission (already working)

**Before**:
```typescript
return {
  cartId: cart.getId(),
  orderId: uuidv4(), // ❌ Fake ID
  restaurantId: cart.getRestaurantId()!,
  items: [...],
  totalAmountCents: cart.getTotalAmount().cents,
  paymentMethodIndex: input.paymentMethodIndex,
  paymentMethodType: input.paymentMethodType,
};
```

**After**:
```typescript
return {
  cartId: cart.getId(),
  restaurantId: cart.getRestaurantId()!,
  totalAmountCents: cart.getTotalAmount().cents,
  message: 'Order is being created',
};
```

### Order Service
**Files to create**:
- `packages/order-service/src/infra/messaging/rabbitmq/cart-consumer.ts`
- `packages/order-service/src/application/use-cases/create-order-from-cart/create-order-from-cart.use-case.ts`
- `packages/order-service/src/application/use-cases/create-order-from-cart/create-order-from-cart.dto.ts`

**Files to modify**:
- `packages/order-service/src/order.module.ts` - Register CartConsumer
- `packages/order-service/src/infra/messaging/rabbitmq/order.consumer.ts` - Add `order.created` publishing

**New CartConsumer**:
```typescript
@Injectable()
export class CartConsumer {
  constructor(
    @Inject(RABBITMQ_CONNECTION) private readonly connection: RabbitMQConnection,
    private readonly createOrderFromCartUseCase: CreateOrderFromCartUseCase,
  ) {}

  async start(): Promise<void> {
    await this.connection.subscribe(
      'order-service-cart-events',
      ['cart.checked-out'],
      async (event: DomainEvent) => {
        const data = event.data as CartCheckedOutData;

        await this.createOrderFromCartUseCase.execute({
          cartId: data.cartId,
          customerId: data.customerId,
          restaurantId: data.restaurantId,
          items: data.items,
          totalAmountCents: data.totalAmountCents,
        });
      },
    );
  }
}
```

**New CreateOrderFromCartUseCase**:
```typescript
@Injectable()
export class CreateOrderFromCartUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY) private readonly orderRepository: OrderRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CreateOrderFromCartInput): Promise<void> {
    const items = input.items.map(
      (item) => OrderItem.create({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: Money.BRLFromCents(item.priceCents),
      }),
    );

    const order = Order.create({
      customerId: input.customerId,
      restaurantId: input.restaurantId,
      items,
      // Payment method will be added later by customer selection
    });

    await this.orderRepository.save(order);
    await this.eventPublisher.publishAll(order.getDomainEvents());
    order.clearDomainEvents();
  }
}
```

### Shared Events
**Verify existing**:
- `packages/shared/src/events/cart-checked-out.event.ts` ✓ (exists)
- `packages/shared/src/events/order-created.event.ts` ✓ (exists)

## Module Registration

### Order Service Module
Add to `order.module.ts`:

```typescript
import { CartConsumer } from './infra/messaging/rabbitmq/cart-consumer';
import { CreateOrderFromCartUseCase } from './application/use-cases/create-order-from-cart/create-order-from-cart.use-case';

// ...

@Module({
  // ...
  providers: [
    // ... existing providers
    CartConsumer,
    CreateOrderFromCartUseCase,
  ],
})
export class OrderModule implements OnModuleInit {
  constructor(
    private readonly orderConsumer: OrderConsumer,
    private readonly cartConsumer: CartConsumer, // Add
  ) {}

  async onModuleInit() {
    await this.orderConsumer.start();
    await this.cartConsumer.start(); // Add
  }
}
```

## Testing Strategy

### Unit Tests
1. **CartCheckoutUseCase** - Verify returns only cartId, no fake orderId
2. **CreateOrderFromCartUseCase** - Verify creates Order from cart data
3. **CartConsumer** - Verify subscribes to `cart.checked-out`

### Integration Tests
```typescript
describe('Cart → Order Flow', () => {
  it('should create order when cart is checked out', async () => {
    // 1. Add item to cart
    // 2. Checkout cart
    // 3. Wait for event processing
    // 4. Verify order exists in DB
    // 5. Verify order.created event emitted
  });
});
```

### E2E Test
```bash
# Add to existing e2e flow
curl -X POST http://localhost:3000/cart/items \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"productId":"xxx","quantity":2,"restaurantId":"yyy"}'

curl -X POST http://localhost:3000/cart/checkout \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"paymentMethodType":"PIX"}'

# Verify order created
curl http://localhost:3001/orders/{orderId}
```

## Event Flow Validation

```
cart.checked-out → OrderService (new consumer)
  ↓
order.created → PaymentService (existing consumer)
  ↓
payment.confirmed → OrderService (existing consumer)
  ↓
order.confirmed → KitchenService (existing)
```

## Implementation Order

1. **Step 1**: Create DTOs for CreateOrderFromCartUseCase
2. **Step 2**: Implement CreateOrderFromCartUseCase
3. **Step 3**: Create CartConsumer with subscription
4. **Step 4**: Update OrderModule to register CartConsumer
5. **Step 5**: Modify CheckoutCartUseCase to remove fake orderId
6. **Step 6**: Update CheckoutCartDto to remove orderId from output
7. **Step 7**: Add unit tests
8. **Step 8**: Add integration test
9. **Step 9**: Run full test suite
10. **Step 10**: Update API documentation

## Files Summary

### New Files (3)
```
packages/order-service/src/application/use-cases/create-order-from-cart/
  ├── create-order-from-cart.use-case.ts
  ├── create-order-from-cart.dto.ts
  └── (spec files)

packages/order-service/src/infra/messaging/rabbitmq/
  └── cart-consumer.ts
```

### Modified Files (4)
```
packages/cart-service/src/application/use-cases/checkout-cart/
  ├── checkout-cart.use-case.ts
  └── checkout-cart.dto.ts

packages/order-service/src/
  ├── order.module.ts
  └── tokens.ts (if needed)
```

## Rollout Plan

1. Deploy Order Service changes first (consumer ready)
2. Deploy Cart Service changes (remove fake orderId)
3. Monitor for `order.created` events
4. Verify payment flow still works

## Backwards Compatibility

**Breaking**: CheckoutCartOutput no longer returns `orderId`

**Migration**: Frontend must poll or listen for order status via:
- `GET /orders` (list customer orders)
- WebSocket subscription (future)
- Or wait for notification service

## Success Criteria

- [ ] Cart checkout emits `cart.checked-out` with all required data
- [ ] Order Service creates Order from cart event
- [ ] Order Service emits `order.created`
- [ ] Payment Service processes payment (existing)
- [ ] All tests passing (269+)
- [ ] E2E flow completes successfully
