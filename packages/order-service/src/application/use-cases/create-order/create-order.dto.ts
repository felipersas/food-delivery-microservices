import { IsString, IsNumber, IsArray, ValidateNested, Min, IsUUID, IsOptional, IsIn } from 'class-validator';
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

  @ApiProperty({ description: 'Unit price in BRL', example: 45.90, minimum: 0.01 })
  @IsNumber()
  @Min(0.01)
  unitPrice!: number;
}

export class CreateOrderDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiProperty({ description: 'Restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  restaurantId!: string;

  @ApiProperty({
    description: 'Order items (total will be calculated automatically)',
    type: [CreateOrderItemDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @ApiPropertyOptional({
    description: 'Index of saved payment method from customer profile',
    example: 0,
    minimum: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  paymentMethodIndex?: number;

  @ApiPropertyOptional({
    description: 'Payment method type (for new payment methods)',
    example: 'CREDIT_CARD',
    enum: ['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['CREDIT_CARD', 'DEBIT_CARD', 'PIX', 'CASH'])
  paymentMethodType?: string;
}

export type CreateOrderInput = CreateOrderDto;

export interface CreateOrderOutput {
  orderId: string;
  status: string;
  totalAmount: number;
}
