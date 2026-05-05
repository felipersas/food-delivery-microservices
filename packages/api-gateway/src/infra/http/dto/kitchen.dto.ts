import { IsString, IsUUID, IsOptional, IsEnum } from 'class-validator';

export enum KitchenTicketStatus {
  PENDING = 'PENDING',
  PREPARING = 'PREPARING',
  READY = 'READY',
  DELIVERED = 'DELIVERED',
}

export class GetKitchenTicketsDto {
  @IsOptional()
  @IsEnum(KitchenTicketStatus)
  status?: KitchenTicketStatus;

  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}

export class GetKitchenTicketByIdDto {
  @IsUUID()
  id!: string;
}

export class GetKitchenQueueDto {
  @IsOptional()
  @IsUUID()
  restaurantId?: string;
}

export class UpdateKitchenTicketDto {
  @IsEnum(KitchenTicketStatus)
  status!: KitchenTicketStatus;
}

export class CompleteKitchenItemDto {
  @IsUUID()
  id!: string;

  @IsUUID()
  itemId!: string;
}
