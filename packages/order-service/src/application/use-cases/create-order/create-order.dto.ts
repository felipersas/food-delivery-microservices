import { IsString, IsNumber, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
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

  @ApiProperty({ description: 'Unit price in BRL', example: 45.90, minimum: 0 })
  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  restaurantId!: string;

  @ApiProperty({ description: 'Order items', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export type CreateOrderInput = CreateOrderDto;

export interface CreateOrderOutput {
  orderId: string;
  status: string;
  totalAmount: number;
}
