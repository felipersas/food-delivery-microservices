import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Headers,
  UseInterceptors,
  Inject,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { HttpProxyStrategy } from '../../strategies/http-proxy.strategy';
import { LoggingInterceptor } from '../../interceptors/logging.interceptor';
import { TimeoutInterceptor } from '../../interceptors/timeout.interceptor';
import {
  AddCartItemDto,
  UpdateItemQuantityDto,
  CheckoutCartDto,
} from '../dto/carts.dto';
import { CART_SERVICE_URL } from '../../../tokens';

@ApiTags('carts')
@Controller('cart')
@UseInterceptors(LoggingInterceptor, TimeoutInterceptor)
export class CartsController {
  constructor(
    @Inject(CART_SERVICE_URL) private readonly cartServiceUrl: string,
    private readonly proxy: HttpProxyStrategy,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get active cart (proxy)', description: 'Proxies cart retrieval to Cart Service' })
  @ApiBearerAuth()
  async getCart(@Headers('authorization') auth?: string) {
    return this.proxy.get(`${this.cartServiceUrl}/cart`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('items')
  @ApiOperation({ summary: 'Add item to cart (proxy)', description: 'Proxies item addition to Cart Service' })
  @ApiBearerAuth()
  async addItem(@Body() body: AddCartItemDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.cartServiceUrl}/cart/items`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update item quantity (proxy)', description: 'Proxies quantity update to Cart Service' })
  @ApiBearerAuth()
  async updateQuantity(
    @Param('productId') productId: string,
    @Body() body: UpdateItemQuantityDto,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.patch(`${this.cartServiceUrl}/cart/items/${productId}`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove item from cart (proxy)', description: 'Proxies item removal to Cart Service' })
  @ApiBearerAuth()
  async removeItem(
    @Param('productId') productId: string,
    @Headers('authorization') auth?: string,
  ) {
    return this.proxy.delete(`${this.cartServiceUrl}/cart/items/${productId}`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart (proxy)', description: 'Proxies cart clearing to Cart Service' })
  @ApiBearerAuth()
  async clearCart(@Headers('authorization') auth?: string) {
    return this.proxy.delete(`${this.cartServiceUrl}/cart`, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }

  @Post('checkout')
  @ApiOperation({ summary: 'Checkout cart (proxy)', description: 'Proxies cart checkout to Cart Service' })
  @ApiBearerAuth()
  async checkout(@Body() body: CheckoutCartDto, @Headers('authorization') auth?: string) {
    return this.proxy.post(`${this.cartServiceUrl}/cart/checkout`, body, {
      headers: auth ? { authorization: auth } : undefined,
    });
  }
}
