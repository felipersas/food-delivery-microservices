import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { KitchenTicketStatus } from '../../domain/aggregates/kitchen-ticket.aggregate';

export class ListKitchenTicketsDto {
  @ApiPropertyOptional({
    description: 'Filter by restaurant ID',
    example: '223e4567-e89b-12d3-a456-426614174001',
  })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;

  @ApiPropertyOptional({
    description: 'Filter by status',
    example: 'PREPARING',
    enum: KitchenTicketStatus,
  })
  @IsOptional()
  @IsEnum(KitchenTicketStatus)
  status?: KitchenTicketStatus;
}

export interface ListKitchenTicketsInput {
  restaurantId?: string;
  status?: KitchenTicketStatus;
}

export class KitchenTicketListItemOutput {
  @ApiProperty({ description: 'Product ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  productId!: string;

  @ApiProperty({ description: 'Product name', example: 'Margherita Pizza' })
  productName!: string;

  @ApiProperty({ description: 'Quantity', example: 2 })
  quantity!: number;
}

export class KitchenTicketOutput {
  @ApiProperty({ description: 'Ticket ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  ticketId!: string;

  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId!: string;

  @ApiProperty({ description: 'Restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  restaurantId!: string;

  @ApiProperty({
    description: 'Ticket status',
    example: 'PREPARING',
    enum: ['WAITING', 'PREPARING', 'READY'],
  })
  status!: string;

  @ApiProperty({ description: 'Ticket items', type: [KitchenTicketListItemOutput] })
  items!: KitchenTicketListItemOutput[];

  @ApiProperty({ description: 'Creation time', example: '2026-05-05T23:00:00.000Z' })
  createdAt!: Date;

  @ApiProperty({ description: 'Last update time', example: '2026-05-05T23:05:00.000Z' })
  updatedAt!: Date;
}

export type ListKitchenTicketsOutput = KitchenTicketOutput[];
