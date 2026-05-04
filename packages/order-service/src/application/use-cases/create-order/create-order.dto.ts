import { IsString, IsNumber, IsArray, ValidateNested, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateOrderItemDto {
  @IsUUID()
  productId!: string;

  @IsString()
  productName!: string;

  @IsNumber()
  @Min(1)
  quantity!: number;

  @IsNumber()
  @Min(0)
  price!: number;
}

export class CreateOrderDto {
  @IsUUID()
  customerId!: string;

  @IsUUID()
  restaurantId!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}

export type CreateOrderInput = CreateOrderDto;

export interface CreateOrderOutput {
  orderId: string;
  status: string;
  totalAmount: number;
}
