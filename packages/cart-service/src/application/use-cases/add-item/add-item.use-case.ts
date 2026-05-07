import { Injectable, Inject } from '@nestjs/common';
import { Cart } from '@domain/aggregates/cart.aggregate';
import { CartItem } from '@domain/value-objects/cart-item.vo';
import { DomainException } from '@app/shared';
import type { CartRepository } from '@domain/repositories/cart.repository.interface';
import type { EventPublisher } from '@app/shared';
import type { PriceCacheService } from '@services/price-cache.service';
import type { AddItemInput, AddItemOutput } from './add-item.dto';
import {
  CART_REPOSITORY,
  EVENT_PUBLISHER,
  PRICE_CACHE_SERVICE,
} from '@tokens/tokens';

@Injectable()
export class AddItemUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
    @Inject(EVENT_PUBLISHER) private readonly eventPublisher: EventPublisher,
    @Inject(PRICE_CACHE_SERVICE)
    private readonly priceCacheService: PriceCacheService,
  ) {}

  async execute(input: AddItemInput): Promise<AddItemOutput> {
    // Fetch current price and availability via Redis cache
    const { price, available, name } =
      await this.priceCacheService.getItemPrice(input.productId);

    if (!available) {
      throw new DomainException(`Menu item "${name}" is not available`);
    }

    let cart = await this.cartRepository.findActiveByCustomerId(
      input.customerId,
    );

    if (!cart) {
      cart = Cart.create(input.customerId);
    }

    const cartItem = CartItem.create({
      productId: input.productId,
      productName: name,
      quantity: input.quantity,
      unitPrice: price, // Current price from cache
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
      priceCents: price.cents,
    };
  }
}
