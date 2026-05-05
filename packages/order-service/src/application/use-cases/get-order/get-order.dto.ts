import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponse {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Margherita Pizza' })
  productName!: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price in BRL', example: 45.90 })
  unitPrice!: number;
}

export class GetOrderOutput {
  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId!: string;

  @ApiProperty({ description: 'Customer ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  customerId!: string;

  @ApiProperty({ description: 'Restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  restaurantId!: string;

  @ApiProperty({
    description: 'Order status',
    example: 'PENDING',
    enum: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'],
  })
  status!: string;

  @ApiProperty({ description: 'Total amount in BRL', example: 91.80 })
  totalAmount!: number;

  @ApiProperty({ description: 'Order items', type: [OrderItemResponse] })
  items!: OrderItemResponse[];
}
