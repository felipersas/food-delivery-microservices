import { IsString, IsNumber, IsArray, IsUUID, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderFromCartItemDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Margherita Pizza' })
  @IsString()
  productName!: string;

  @ApiProperty({ description: 'Quantity', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;

  @ApiProperty({ description: 'Unit price in cents', example: 4590 })
  @IsNumber()
  @Min(0)
  priceCents!: number;
}

export class CreateOrderFromCartDto {
  @ApiProperty({ description: 'Cart ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  cartId!: string;

  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  restaurantId!: string;

  @ApiProperty({
    description: 'Order items from cart',
    type: [CreateOrderFromCartItemDto],
    minItems: 1,
  })
  @IsArray()
  items!: CreateOrderFromCartItemDto[];

  @ApiProperty({ description: 'Total amount in cents', example: 9180 })
  @IsNumber()
  @Min(0)
  totalAmountCents!: number;
}

export type CreateOrderFromCartInput = CreateOrderFromCartDto;

export interface CreateOrderFromCartOutput {
  orderId: string;
  status: string;
}
