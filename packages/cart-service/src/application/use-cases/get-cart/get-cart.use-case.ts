import { Injectable, Inject } from '@nestjs/common';
import { Cart } from '../../../domain/aggregates/cart.aggregate';
import type { CartRepository } from '../../../domain/repositories/cart.repository.interface';
import type { GetCartInput, GetCartOutput } from './get-cart.dto';
import { CART_REPOSITORY } from '../../../../tokens';

@Injectable()
export class GetCartUseCase {
  constructor(
    @Inject(CART_REPOSITORY) private readonly cartRepository: CartRepository,
  ) {}

  async execute(input: GetCartInput): Promise<GetCartOutput> {
    let cart = await this.cartRepository.findActiveByCustomerId(input.customerId);

    if (!cart) {
      cart = Cart.create(input.customerId);
      await this.cartRepository.save(cart);
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
}
