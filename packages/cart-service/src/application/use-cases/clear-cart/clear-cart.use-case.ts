import { Injectable, Inject } from '@nestjs/common';
import { Cart } from '../../../domain/aggregates/cart.aggregate';
import type { CartRepository } from '../../../domain/repositories/cart.repository.interface';
import type { EventPublisher } from '../../../infra/messaging/rabbitmq/cart-event.publisher';
import type { ClearCartInput, ClearCartOutput } from './clear-cart.dto';
import { CART_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class ClearCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: ClearCartInput): Promise<ClearCartOutput> {
    let cart = await this.cartRepository.findActiveByCustomerId(input.customerId);

    if (!cart) {
      cart = Cart.create(input.customerId);
      await this.cartRepository.save(cart);
    }

    cart.clear();

    await this.cartRepository.save(cart);
    await this.eventPublisher.publishAll(cart.getDomainEvents());
    cart.clearDomainEvents();

    return {
      cartId: cart.getId(),
      cleared: true,
    };
  }
}
