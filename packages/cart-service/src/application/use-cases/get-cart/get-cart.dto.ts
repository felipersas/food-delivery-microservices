import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetCartDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  customerId!: string;
}

export type GetCartInput = GetCartDto;

export interface CartItemOutput {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  priceChanged?: boolean;
  originalPriceCents?: number;
}

export interface GetCartOutput {
  cartId: string;
  customerId: string;
  restaurantId: string | null;
  items: CartItemOutput[];
  totalAmountCents: number;
  status: string;
}
