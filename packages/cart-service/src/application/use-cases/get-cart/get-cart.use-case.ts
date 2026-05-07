import { Injectable, Inject } from '@nestjs/common';
import { Cart } from '@domain/aggregates/cart.aggregate';
import type { CartRepository } from '@domain/repositories/cart.repository.interface';
import type { PriceCacheService } from '@services/price-cache.service';
import type { GetCartInput, GetCartOutput } from './get-cart.dto';
import { CART_REPOSITORY, PRICE_CACHE_SERVICE } from '@tokens/tokens';

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
    @Inject(PRICE_CACHE_SERVICE)
    private readonly priceCacheService: PriceCacheService,
  ) {}

  async execute(input: GetCartInput): Promise<GetCartOutput> {
    let cart = await this.cartRepository.findActiveByCustomerId(
      input.customerId,
    );

    if (!cart) {
      cart = Cart.create(input.customerId);
      await this.cartRepository.save(cart);
    }

    // Fetch current prices for all cart items
    const items = cart.getItems();
    if (items.length > 0) {
      const itemIds = items.map((item) => item.productId);
      const currentPrices = await this.priceCacheService.getItemPrices(itemIds);
      return this.toOutputWithPrices(cart, currentPrices);
    }

    return this.toOutput(cart);
  }

  private toOutput(cart: Cart): GetCartOutput {
    return {
      cartId: cart.getId(),
      customerId: cart.getCustomerId(),
      restaurantId: cart.getRestaurantId(),
      items: cart.getItems().map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        unitPriceCents: item.unitPrice.cents,
        totalCents: item.getTotal().cents,
      })),
      totalAmountCents: cart.getTotalAmount().cents,
      status: cart.getStatus(),
    };
  }

  private toOutputWithPrices(
    cart: Cart,
    currentPrices: Map<
      string,
      { price: { cents: number }; available: boolean; name: string }
    >,
  ): GetCartOutput {
    const items = cart.getItems();
    const totalAmountCents = items.reduce((sum, item) => {
      const currentPrice = currentPrices.get(item.productId);
      const priceToUse = currentPrice
        ? currentPrice.price.cents
        : item.unitPrice.cents;
      return sum + priceToUse * item.quantity;
    }, 0);

    return {
      cartId: cart.getId(),
      customerId: cart.getCustomerId(),
      restaurantId: cart.getRestaurantId(),
      items: items.map((item) => {
        const currentPrice = currentPrices.get(item.productId);
        const priceChanged =
          currentPrice && currentPrice.price.cents !== item.unitPrice.cents;

        return {
          productId: item.productId,
          productName: item.productName,
          quantity: item.quantity,
          unitPriceCents: currentPrice
            ? currentPrice.price.cents
            : item.unitPrice.cents,
          totalCents: currentPrice
            ? currentPrice.price.cents * item.quantity
            : item.getTotal().cents,
          priceChanged,
          originalPriceCents: priceChanged ? item.unitPrice.cents : undefined,
        };
      }),
      totalAmountCents,
      status: cart.getStatus(),
    };
  }
}
