import {
  IsString,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateKitchenTicketItemDto {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Margherita Pizza' })
  @IsString()
  productName!: string;

  @ApiProperty({ description: 'Quantity', example: 2, minimum: 1 })
  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateKitchenTicketDto {
  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  orderId!: string;

  @ApiProperty({
    description: 'Restaurant ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  restaurantId!: string;

  @ApiProperty({
    description: 'Kitchen ticket items',
    type: [CreateKitchenTicketItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKitchenTicketItemDto)
  items!: CreateKitchenTicketItemDto[];
}

export class KitchenTicketItemResponse {
  @ApiProperty({
    description: 'Product ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Margherita Pizza' })
  productName!: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity!: number;
}

export class CreateKitchenTicketOutput {
  @ApiProperty({
    description: 'Ticket ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  ticketId!: string;

  @ApiProperty({
    description: 'Order ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  orderId!: string;

  @ApiProperty({
    description: 'Ticket status',
    example: 'PENDING',
    enum: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'],
  })
  status!: string;

  @ApiProperty({
    description: 'Ticket items',
    type: [KitchenTicketItemResponse],
  })
  items!: KitchenTicketItemResponse[];
}

export type CreateKitchenTicketInput = CreateKitchenTicketDto;
