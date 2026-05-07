import { Injectable, Inject } from '@nestjs/common';
import { Cart } from '../../../domain/aggregates/cart.aggregate';
import type { CartRepository } from '../../../domain/repositories/cart.repository.interface';
import type { EventPublisher } from '@app/shared';
import type {
  UpdateQuantityInput,
  UpdateQuantityOutput,
} from './update-quantity.dto';
import { CART_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class UpdateQuantityUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: UpdateQuantityInput): Promise<UpdateQuantityOutput> {
    let cart = await this.cartRepository.findActiveByCustomerId(
      input.customerId,
    );

    if (!cart) {
      cart = Cart.create(input.customerId);
      await this.cartRepository.save(cart);
      return {
        cartId: cart.getId(),
        productId: input.productId,
        quantity: input.quantity,
      };
    }

    cart.updateItemQuantity(input.productId, input.quantity);

    await this.cartRepository.save(cart);
    await this.eventPublisher.publishAll(cart.getDomainEvents());
    cart.clearDomainEvents();

    return {
      cartId: cart.getId(),
      productId: input.productId,
      quantity: input.quantity,
    };
  }
}
