import { ApiProperty } from '@nestjs/swagger';

export class KitchenTicketItemResponse {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Margherita Pizza' })
  productName!: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity!: number;
}

export class GetKitchenTicketOutput {
  @ApiProperty({ description: 'Ticket ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  ticketId!: string;

  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId!: string;

  @ApiProperty({
    description: 'Ticket status',
    example: 'PENDING',
    enum: ['PENDING', 'PREPARING', 'READY', 'DELIVERED'],
  })
  status!: string;

  @ApiProperty({ description: 'Ticket items', type: [KitchenTicketItemResponse] })
  items!: KitchenTicketItemResponse[];
}
