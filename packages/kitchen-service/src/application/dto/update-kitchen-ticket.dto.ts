import { IsEnum } from 'class-validator';
import { KitchenTicketStatus } from '../../domain/aggregates/kitchen-ticket.aggregate';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateKitchenTicketDto {
  @ApiProperty({
    description: 'New ticket status',
    example: 'PREPARING',
    enum: KitchenTicketStatus,
  })
  @IsEnum(KitchenTicketStatus)
  status!: KitchenTicketStatus;
}

export class UpdateKitchenTicketOutput {
  @ApiProperty({ description: 'Ticket ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  ticketId!: string;

  @ApiProperty({ description: 'Order ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  orderId!: string;

  @ApiProperty({
    description: 'Updated status',
    example: 'PREPARING',
    enum: KitchenTicketStatus,
  })
  status!: string;
}
