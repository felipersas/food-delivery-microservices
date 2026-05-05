import {
  IsString,
  IsArray,
  ValidateNested,
  Min,
  IsUUID,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateKitchenTicketItemDto {
  @IsUUID()
  productId!: string;

  @IsString()
  productName!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;
}

export class CreateKitchenTicketDto {
  @IsUUID()
  orderId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateKitchenTicketItemDto)
  items!: CreateKitchenTicketItemDto[];
}

export interface CreateKitchenTicketOutput {
  ticketId: string;
  orderId: string;
  status: string;
  items: Array<{ productId: string; productName: string; quantity: number }>;
}

export type CreateKitchenTicketInput = CreateKitchenTicketDto;
