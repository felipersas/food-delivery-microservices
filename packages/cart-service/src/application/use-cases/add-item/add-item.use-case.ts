import { Injectable, Inject } from '@nestjs/common';
import { Cart } from '../../../domain/aggregates/cart.aggregate';
import { CartItem } from '../../../domain/value-objects/cart-item.vo';
import { Money } from '@app/shared';
import type { CartRepository } from '../../../domain/repositories/cart.repository.interface';
import type { EventPublisher } from '../../../infra/messaging/rabbitmq/cart-event.publisher';
import type { AddItemInput, AddItemOutput } from './add-item.dto';
import { CART_REPOSITORY, EVENT_PUBLISHER } from '../../../tokens';

@Injectable()
export class AddItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
  ) {}

  async execute(input: AddItemInput): Promise<AddItemOutput> {
    let cart = await this.cartRepository.findActiveByCustomerId(input.customerId);

    if (!cart) {
      cart = Cart.create(input.customerId);
    }

    const cartItem = CartItem.create({
      productId: input.productId,
      productName: '', // Will be populated by fetching from Restaurant Service
      quantity: input.quantity,
      unitPrice: Money.BRL(0), // Will be populated by fetching from Restaurant Service
      restaurantId: input.restaurantId,
    });

    cart.addItem(cartItem);

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
