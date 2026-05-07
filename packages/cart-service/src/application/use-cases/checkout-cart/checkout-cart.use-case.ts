import { Injectable, Inject } from '@nestjs/common';
import { v4 as uuidv4 } from 'uuid';
import type { CartRepository } from '@domain/repositories/cart.repository.interface';
import type { EventPublisher } from '@app/shared';
import type {
  CheckoutCartInput,
  CheckoutCartOutput,
  CheckoutOrderItem,
} from './checkout-cart.dto';
import { CART_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class CheckoutCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: CheckoutCartInput): Promise<CheckoutCartOutput> {
    const cart = await this.cartRepository.findActiveByCustomerId(
      input.customerId,
    );

    if (!cart) {
      throw new Error('Cart not found');
    }

    cart.checkout();

    await this.cartRepository.save(cart);
    await this.eventPublisher.publishAll(cart.getDomainEvents());
    cart.clearDomainEvents();

    // Generate order ID (in real implementation, this would come from Order Service)
    const orderId = uuidv4();

    return {
      cartId: cart.getId(),
      orderId,
      restaurantId: cart.getRestaurantId()!,
      items: cart.getItems().map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        priceCents: item.unitPrice.cents,
      })),
      totalAmountCents: cart.getTotalAmount().cents,
      paymentMethodIndex: input.paymentMethodIndex,
      paymentMethodType: input.paymentMethodType,
    };
  }
}
