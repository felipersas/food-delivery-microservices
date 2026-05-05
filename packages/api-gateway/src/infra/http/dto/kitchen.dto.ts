import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum KitchenTicketStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
}

export class GetKitchenTicketsDto {
  @ApiPropertyOptional({
    description: 'Filter by ticket status',
    example: 'PENDING',
    enum: KitchenTicketStatus,
  })
  @IsOptional()
  @IsEnum(KitchenTicketStatus)
  status?: KitchenTicketStatus;

  @ApiPropertyOptional({ description: 'Filter by restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}

export class GetKitchenTicketByIdDto {
  @ApiProperty({ description: 'Ticket ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;
}

export class GetKitchenQueueDto {
  @ApiPropertyOptional({ description: 'Filter by restaurant ID', example: '223e4567-e89b-12d3-a456-426614174001' })
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}

export class UpdateKitchenTicketDto {
  @ApiProperty({
    description: 'New ticket status',
    example: 'PREPARING',
    enum: KitchenTicketStatus,
  })
  @IsEnum(KitchenTicketStatus)
  status!: KitchenTicketStatus;
}

export class CompleteKitchenItemDto {
  @ApiProperty({ description: 'Ticket ID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  id!: string;

  @ApiProperty({ description: 'Item ID to complete', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  itemId!: string;
}
