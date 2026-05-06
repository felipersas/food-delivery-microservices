import { IsUUID, IsNumber, Min, Max, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Add Cart Item DTO
export class AddCartItemDto {
  @ApiProperty({ example: 'menu-item-id', description: 'Menu item ID to add to cart' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 'restaurant-id', description: 'Restaurant ID that owns the menu item' })
  @IsUUID()
  restaurantId!: string;

  @ApiProperty({ example: 1, description: 'Quantity to add (1-99)', minimum: 1, maximum: 99 })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;
}

// Update Item Quantity DTO
export class UpdateItemQuantityDto {
  @ApiProperty({ example: 2, description: 'New quantity (1-99)', minimum: 1, maximum: 99 })
  @IsNumber()
  @Min(1)
  @Max(99)
  quantity!: number;
}

// Checkout Cart DTO
export class CheckoutCartDto {
  @ApiPropertyOptional({ example: 0, description: 'Payment method index (0-3)', minimum: 0, maximum: 3 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(3)
  paymentMethodIndex?: number;

  @ApiPropertyOptional({
    example: 'CREDIT_CARD',
    description: 'Payment method type',
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'],
  })
  @IsOptional()
  @IsEnum(['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'])
  paymentMethodType?: string;
}
