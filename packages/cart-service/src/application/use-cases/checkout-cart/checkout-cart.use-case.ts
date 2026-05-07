import { Injectable, Inject } from '@nestjs/common';
import type { CartRepository } from '@domain/repositories/cart.repository.interface';
import type { EventPublisher } from '@app/shared';
import type {
  CheckoutCartInput,
  CheckoutCartOutput,
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

    // Order will be created asynchronously by Order Service via cart.checked-out event
    return {
      cartId: cart.getId(),
      restaurantId: cart.getRestaurantId()!,
      totalAmountCents: cart.getTotalAmount().cents,
      message: 'Order is being created',
    };
  }
}
