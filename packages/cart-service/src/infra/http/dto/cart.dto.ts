import {
  IsUUID,
  IsNumber,
  Min,
  Max,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodType } from '@application/use-cases/checkout-cart/checkout-cart.dto';

/**
 * HTTP DTOs for Cart Controller
 * These classes handle validation for incoming HTTP requests.
 * The customerId is injected via @CurrentUser() decorator, not from request body.
 */

export class AddCartItemInput {
  @ApiProperty({ example: 'menu-item-id' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'restaurant-id' })
  @IsUUID()
  restaurantId!: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class UpdateQuantityInput {
  @ApiProperty({ example: 2 })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;
}

export class CheckoutInput {
  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  paymentMethodIndex?: number;

  @ApiProperty({
    enum: PaymentMethodType,
    required: false,
  })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethodType?: PaymentMethodType;
}
