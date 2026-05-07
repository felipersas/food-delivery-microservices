import { IsUUID, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrderSortField {
  CREATED_AT = 'createdAt',
  TOTAL_AMOUNT = 'totalAmount',
  STATUS = 'status',
}

export enum SortOrder {
  ASC = 'ASC',
  DESC = 'DESC',
}

export class ListOrdersDto {
  @ApiProperty({ description: 'Customer ID' })
  @IsUUID()
  customerId!: string;

  @ApiPropertyOptional({
    description: 'Sort field',
    enum: OrderSortField,
    default: OrderSortField.CREATED_AT,
  })
  @IsOptional()
  @IsEnum(OrderSortField)
  sortField?: OrderSortField;

  @ApiPropertyOptional({
    description: 'Sort order',
    enum: SortOrder,
    default: SortOrder.DESC,
  })
  @IsOptional()
  @IsEnum(SortOrder)
  sortOrder?: SortOrder;
}

export type ListOrdersInput = ListOrdersDto;

export interface OrderListItemOutput {
  id: string;
  customerId: string;
  restaurantId: string;
  status: string;
  totalAmountCents: number;
  totalAmount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    priceCents: number;
  }>;
  createdAt: string;
}

export interface ListOrdersOutput {
  orders: OrderListItemOutput[];
  total: number;
}
