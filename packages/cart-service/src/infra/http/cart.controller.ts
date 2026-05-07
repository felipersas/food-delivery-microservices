import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UsePipes,
  ValidationPipe,
  Param,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import {
  Roles,
  UserRoleEnum,
  CurrentUser,
  type UserContext,
} from '@app/shared';
import { GetCartUseCase } from '@application/use-cases/get-cart/get-cart.use-case';
import { AddItemUseCase } from '@application/use-cases/add-item/add-item.use-case';
import { RemoveItemUseCase } from '@application/use-cases/remove-item/remove-item.use-case';
import { UpdateQuantityUseCase } from '@application/use-cases/update-quantity/update-quantity.use-case';
import { ClearCartUseCase } from '@application/use-cases/clear-cart/clear-cart.use-case';
import { CheckoutCartUseCase } from '@application/use-cases/checkout-cart/checkout-cart.use-case';
import type { GetCartOutput } from '@application/use-cases/get-cart/get-cart.dto';
import type { AddItemOutput } from '@application/use-cases/add-item/add-item.dto';
import type { RemoveItemOutput } from '@application/use-cases/remove-item/remove-item.dto';
import type { UpdateQuantityOutput } from '@application/use-cases/update-quantity/update-quantity.dto';
import type { ClearCartOutput } from '@application/use-cases/clear-cart/clear-cart.dto';
import type { CheckoutCartOutput } from '@application/use-cases/checkout-cart/checkout-cart.dto';
import {
  AddCartItemInput,
  UpdateQuantityInput,
  CheckoutInput,
} from './dto/cart.dto';

@ApiTags('carts')
@ApiBearerAuth('JWT')
@Controller('cart')
export class CartController {
  constructor(
    private readonly getCartUseCase: GetCartUseCase,
    private readonly addItemUseCase: AddItemUseCase,
    private readonly removeItemUseCase: RemoveItemUseCase,
    private readonly updateQuantityUseCase: UpdateQuantityUseCase,
    private readonly clearCartUseCase: ClearCartUseCase,
    private readonly checkoutCartUseCase: CheckoutCartUseCase,
  ) {}

  @Get()
  @Roles(UserRoleEnum.CUSTOMER)
  @ApiOperation({
    summary: 'Get active cart',
    description:
      'Retrieves the active shopping cart for the authenticated customer',
  })
  @ApiResponse({ status: 200, description: 'Cart retrieved successfully' })
  async getCart(
    @CurrentUser() userContext: UserContext,
  ): Promise<GetCartOutput> {
    return this.getCartUseCase.execute({ customerId: userContext.userId });
  }

  @Post('items')
  @Roles(UserRoleEnum.CUSTOMER)
  @ApiOperation({
    summary: 'Add item to cart',
    description: 'Adds a menu item to the customer shopping cart',
  })
  @ApiResponse({ status: 201, description: 'Item added to cart' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async addItem(
    @Body() input: AddCartItemInput,
    @CurrentUser() userContext: UserContext,
  ): Promise<AddItemOutput> {
    return this.addItemUseCase.execute({
      customerId: userContext.userId,
      ...input,
    });
  }

  @Patch('items/:productId')
  @Roles(UserRoleEnum.CUSTOMER)
  @ApiOperation({
    summary: 'Update item quantity',
    description: 'Updates the quantity of an item in the cart',
  })
  @ApiResponse({ status: 200, description: 'Item quantity updated' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async updateQuantity(
    @Param('productId') productId: string,
    @Body() input: UpdateQuantityInput,
    @CurrentUser() userContext: UserContext,
  ): Promise<UpdateQuantityOutput> {
    return this.updateQuantityUseCase.execute({
      customerId: userContext.userId,
      productId,
      ...input,
    });
  }

  @Delete('items/:productId')
  @Roles(UserRoleEnum.CUSTOMER)
  @ApiOperation({
    summary: 'Remove item from cart',
    description: 'Removes an item from the customer shopping cart',
  })
  @ApiResponse({ status: 200, description: 'Item removed from cart' })
  async removeItem(
    @Param('productId') productId: string,
    @CurrentUser() userContext: UserContext,
  ): Promise<RemoveItemOutput> {
    return this.removeItemUseCase.execute({
      customerId: userContext.userId,
      productId,
    });
  }

  @Delete()
  @Roles(UserRoleEnum.CUSTOMER)
  @ApiOperation({
    summary: 'Clear cart',
    description: 'Removes all items from the customer shopping cart',
  })
  @ApiResponse({ status: 200, description: 'Cart cleared successfully' })
  async clearCart(
    @CurrentUser() userContext: UserContext,
  ): Promise<ClearCartOutput> {
    return this.clearCartUseCase.execute({ customerId: userContext.userId });
  }

  @Post('checkout')
  @Roles(UserRoleEnum.CUSTOMER)
  @ApiOperation({
    summary: 'Checkout cart',
    description: 'Creates an order from the cart contents and clears the cart',
  })
  @ApiResponse({ status: 201, description: 'Order created successfully' })
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async checkout(
    @Body() input: CheckoutInput,
    @CurrentUser() userContext: UserContext,
  ): Promise<CheckoutCartOutput> {
    return this.checkoutCartUseCase.execute({
      customerId: userContext.userId,
      ...input,
    });
  }
}
