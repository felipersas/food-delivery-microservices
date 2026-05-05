import {
  IsString,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsOptional,
  IsNumber,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsNotEmpty()
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Margherita Pizza' })
  @IsString()
  @IsNotEmpty()
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
  @IsNotEmpty()
  customerId!: string;

  @ApiProperty({ description: 'Restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  @IsUUID()
  @IsNotEmpty()
  restaurantId!: string;

  @ApiProperty({ description: 'Order items', type: [CreateOrderItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export class GetOrderByIdDto {
  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;
}

export class GetOrdersByCustomerDto {
  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({ description: 'Maximum number of results', example: 10, minimum: 1, default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  limit?: number;

  @ApiPropertyOptional({ description: 'Number of results to skip', example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
